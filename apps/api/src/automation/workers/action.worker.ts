import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ActionDispatcher } from '../services/action-dispatcher';
import { ExecutionRepository } from '../repositories/execution.repository';
import { AutomationRepository } from '../repositories/automation.repository';
import { QueueService } from '../services/queue.service';
import { ExecutionStatus, ActionType } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  ValidationError,
  NonRetryableException,
  ExecutionException,
} from '../errors/automation.errors';
import { MetricsService } from '../services/metrics.service';
import { AutomationConfig } from '../config/automation.config';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { DomainEvent } from '../interfaces/domain-event.interface';

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
    private readonly actionDispatcher: ActionDispatcher,
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
    this.logger.log(`Processing job ${job.id} (Name: ${name})`);

    if (
      name !== 'execute-action' &&
      name !== 'delay-action' &&
      name !== 'retry-action'
    ) {
      return;
    }

    const { executionId, actionId, event, correlationId } =
      data as ActionWorkerJobData;
    let targetAuto: AutomationModel | null = null;

    try {
      // Find automation or actions context
      const allAutomations = await this.automationRepo.findMany({});
      targetAuto =
        allAutomations.items.find((auto) =>
          auto.actions.some((act) => act.id === actionId),
        ) || null;

      if (!targetAuto) {
        throw new ExecutionException(
          `Automation containing action ${actionId} not found`,
        );
      }

      const action = targetAuto.actions.find((act) => act.id === actionId);
      if (!action) {
        throw new ExecutionException(`Action ${actionId} not found`);
      }

      // Transition execution status to RUNNING
      await this.executionRepo.updateExecutionStatus(
        executionId,
        ExecutionStatus.RUNNING,
      );

      // 1. Dispatch execution
      await this.actionDispatcher.dispatch(
        {
          id: action.id,
          automationId: targetAuto.id,
          actionType: action.actionType as ActionType,
          payload: action.payload,
        },
        event,
        { executionId },
      );

      // 2. Evaluate subsequent actions
      const currentIndex = targetAuto.actions.findIndex(
        (act) => act.id === actionId,
      );
      const nextIndex = currentIndex + 1;

      if (nextIndex < targetAuto.actions.length) {
        const nextAction = targetAuto.actions[nextIndex];

        if (nextAction.actionType === 'WAIT') {
          const payload = nextAction.payload as Record<string, unknown>;
          const delaySeconds =
            typeof payload?.delaySeconds === 'number'
              ? payload.delaySeconds
              : 0;

          await this.executionRepo.createLog({
            executionId,
            level: 'INFO',
            message: `Scheduling next action (index ${nextIndex}) with wait delay: ${delaySeconds}s`,
            metadata: { nextActionId: nextAction.id },
            correlationId,
          });

          // Transition execution status to WAITING
          await this.executionRepo.updateExecutionStatus(
            executionId,
            ExecutionStatus.WAITING,
          );

          await this.queueService.enqueueDelayAction(
            { executionId, actionId: nextAction.id, event, correlationId },
            delaySeconds,
          );
        } else {
          await this.executionRepo.createLog({
            executionId,
            level: 'INFO',
            message: `Enqueuing next action immediately (index ${nextIndex})`,
            metadata: { nextActionId: nextAction.id },
            correlationId,
          });

          await this.queueService.enqueueExecuteAction({
            executionId,
            actionId: nextAction.id,
            event,
            correlationId,
          });
        }
      } else {
        // Last action completed, update overall execution status to SUCCESS
        const currentExecution = await this.prismaFindExecution(executionId);
        const duration = currentExecution
          ? Date.now() - new Date(currentExecution.startedAt).getTime()
          : 0;

        await this.executionRepo.updateExecutionStatus(
          executionId,
          ExecutionStatus.SUCCESS,
          new Date(),
          duration,
        );

        this.metricsService.incrementSuccess(duration);

        // Warn on slow processes
        if (duration > this.config.slowExecutionThresholdMs) {
          const structuredLogContext = {
            correlationId,
            executionId,
            automationId: targetAuto?.id,
            eventId: event.eventId,
            instagramAccountId: event.instagramAccountId,
            worker: 'ActionWorker',
            duration,
          };
          this.logger.warn(
            `[SLOW EXECUTION] Execution pipeline completed in ${duration}ms (Threshold: ${this.config.slowExecutionThresholdMs}ms)`,
            JSON.stringify(structuredLogContext),
          );
        }

        await this.executionRepo.createLog({
          executionId,
          level: 'INFO',
          message: 'Automation execution pipeline completed successfully.',
          metadata: {},
          correlationId,
        });
      }
    } catch (error) {
      const isValidationError = error instanceof ValidationError;
      const isNonRetryable = error instanceof NonRetryableException;

      const attemptsAllowed = job.opts.attempts ?? this.config.retryAttempts;
      const attemptsMade = job.attemptsMade;

      const isPermanent =
        isValidationError || isNonRetryable || attemptsMade >= attemptsAllowed;

      const structuredLogContext = {
        correlationId,
        executionId,
        automationId: targetAuto?.id || 'unknown',
        eventId: event.eventId,
        instagramAccountId: event.instagramAccountId,
        worker: 'ActionWorker',
        isPermanent,
      };

      this.logger.error(
        `Failed to process action job ${job.id}: ${(error as Error).message || String(error)}`,
        JSON.stringify(structuredLogContext),
      );

      if (isPermanent) {
        // Move to DLQ
        await this.queueService.enqueueDlq({
          automationId: targetAuto?.id || 'unknown',
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
          message: `Action execution failed permanently. Moved to DLQ. Reason: ${(error as Error).message}`,
          metadata: { actionId, error: String(error) },
          correlationId,
        });

        await this.executionRepo.updateExecutionStatus(
          executionId,
          ExecutionStatus.FAILED,
          new Date(),
        );
      } else {
        // Retryable
        this.metricsService.incrementRetry();

        await this.executionRepo.createLog({
          executionId,
          level: 'WARN',
          message: `Action execution failed. Retrying (Attempt ${attemptsMade + 1}/${attemptsAllowed}). Reason: ${(error as Error).message}`,
          metadata: { actionId, error: String(error) },
          correlationId,
        });

        throw error;
      }
    }
  }

  private async prismaFindExecution(executionId: string) {
    try {
      const repoPrisma = (
        this.executionRepo as unknown as { prisma: PrismaService }
      ).prisma;
      return await repoPrisma.automationExecution.findUnique({
        where: { id: executionId },
      });
    } catch {
      return null;
    }
  }
}
