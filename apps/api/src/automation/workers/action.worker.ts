import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ExecutionRepository } from '../repositories/execution.repository';
import { AutomationRepository } from '../repositories/automation.repository';
import { QueueService } from '../services/queue.service';
import { ExecutionStatus } from '@prisma/client';
import {
  ValidationError,
  NonRetryableException,
  ExecutionException,
  RetryException,
} from '../errors/automation.errors';
import { MetricsService } from '../services/metrics.service';
import { AutomationConfig } from '../config/automation.config';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { ExecutionEngine } from '../services/execution-engine';

const concurrencyValue = parseInt(
  process.env.AUTOMATION_CONCURRENCY || '10',
  10,
);

interface ActionWorkerJobData {
  executionId: string;
  actionId: string;
  event: DomainEvent;
  correlationId?: string;
}

@Processor('automation', { concurrency: concurrencyValue })
@Injectable()
export class ActionWorker extends WorkerHost {
  private readonly logger = new Logger(ActionWorker.name);

  constructor(
    private readonly executionEngine: ExecutionEngine,
    private readonly executionRepo: ExecutionRepository,
    private readonly automationRepo: AutomationRepository,
    private readonly queueService: QueueService,
    private readonly metricsService: MetricsService,
    private readonly config: AutomationConfig,
  ) {
    super();
  }

  async process(job: Job<unknown, unknown, string>): Promise<unknown> {
    const { name, data } = job;
    this.logger.log(`[ActionWorker] Processing job ${job.id} (Name: ${name})`);

    if (
      name !== 'execute-action' &&
      name !== 'delay-action' &&
      name !== 'retry-action'
    ) {
      return;
    }

    const { executionId, actionId, event, correlationId } =
      data as ActionWorkerJobData;

    try {
      // Delegate entire execution logic to the decoupled ExecutionEngine
      await this.executionEngine.executeStep(
        executionId,
        actionId,
        event,
        correlationId,
      );

      return { status: 'success', actionId };
    } catch (error) {
      const isValidationError = error instanceof ValidationError;
      const isNonRetryable = error instanceof NonRetryableException;
      const isRetryException = error instanceof RetryException;

      const attemptsAllowed = job.opts.attempts ?? this.config.retryAttempts;
      const attemptsMade = job.attemptsMade;

      // Classify if failure is permanent
      const isPermanent =
        isValidationError ||
        isNonRetryable ||
        (!isRetryException && attemptsMade >= attemptsAllowed);

      const structuredLogContext = {
        correlationId,
        executionId,
        actionId,
        eventId: event.eventId,
        instagramAccountId: event.instagramAccountId,
        worker: 'ActionWorker',
        isPermanent,
        retryCount: attemptsMade,
      };

      this.logger.error(
        `Failed to process action step: ${(error as Error).message || String(error)}`,
        JSON.stringify(structuredLogContext),
      );

      if (isPermanent) {
        // Discard any remaining retry attempts in BullMQ
        try {
          await job.discard();
        } catch (discardErr) {
          this.logger.warn(
            `Failed to discard job attempts in BullMQ: ${String(discardErr)}`,
          );
        }

        // Retrieve actual automationId from the database execution record
        let resolvedAutomationId = event.eventId; // Fallback
        try {
          const execution = await this.executionRepo.findById(executionId);
          if (execution?.automationId) {
            resolvedAutomationId = execution.automationId;
          }
        } catch (dbErr) {
          this.logger.warn(
            `Could not resolve actual automationId for execution ${executionId} on failure: ${String(dbErr)}`,
          );
        }

        // Move execution record to DLQ and mark FAILED status
        await this.queueService.enqueueDlq({
          automationId: resolvedAutomationId,
          executionId,
          eventId: event.eventId,
          failureReason: (error as Error).message || String(error),
          retryCount: attemptsMade,
          lastAttemptAt: new Date(),
          correlationId,
        });

        this.metricsService.incrementDlq();
        this.metricsService.incrementFailure();

        await this.executionRepo.createLog({
          executionId,
          level: 'ERROR',
          message: `Action step execution failed permanently. Moved to DLQ. Reason: ${(error as Error).message}`,
          metadata: { actionId, error: String(error) },
          correlationId,
        });

        await this.executionRepo.updateExecutionStatus(
          executionId,
          ExecutionStatus.FAILED,
          new Date(),
        );

        // Throw error so BullMQ marks the job as failed
        throw error;
      } else {
        // Increment retry count metrics and queue next retry attempt
        this.metricsService.incrementRetry();

        await this.executionRepo.createLog({
          executionId,
          level: 'WARN',
          message: `Action execution failed transiently. Retrying (Attempt ${attemptsMade + 1}/${attemptsAllowed}). Reason: ${(error as Error).message}`,
          metadata: { actionId, error: String(error) },
          correlationId,
        });

        throw error;
      }
    }
  }
}
