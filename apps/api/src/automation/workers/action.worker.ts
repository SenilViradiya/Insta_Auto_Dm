import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ActionDispatcher } from '../services/action-dispatcher';
import { ExecutionRepository } from '../repositories/execution.repository';
import { AutomationRepository } from '../repositories/automation.repository';
import { QueueService } from '../services/queue.service';
import { ExecutionStatus } from '@prisma/client';
import {
  ValidationError,
  NonRetryableError,
} from '../errors/automation.errors';
import { MetricsService } from '../services/metrics.service';

@Processor('automation')
@Injectable()
export class ActionWorker extends WorkerHost {
  private readonly logger = new Logger(ActionWorker.name);

  constructor(
    private readonly actionDispatcher: ActionDispatcher,
    private readonly executionRepo: ExecutionRepository,
    private readonly automationRepo: AutomationRepository,
    private readonly queueService: QueueService,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name, data } = job;
    this.logger.log(`Processing job ${job.id} (Name: ${name})`);

    if (
      name !== 'execute-action' &&
      name !== 'delay-action' &&
      name !== 'retry-action'
    ) {
      return;
    }

    const { executionId, actionId, event } = data;
    let targetAuto: any = null;

    try {
      // Find automation or actions context
      const allAutomations = await this.automationRepo.findMany({});
      targetAuto = allAutomations.items.find((auto: any) =>
        auto.actions.some((act: any) => act.id === actionId),
      );

      if (!targetAuto) {
        throw new Error(`Automation containing action ${actionId} not found`);
      }

      const action = targetAuto.actions.find((act: any) => act.id === actionId);
      if (!action) {
        throw new Error(`Action ${actionId} not found`);
      }

      // Transition execution status to RUNNING
      await this.executionRepo.updateExecutionStatus(
        executionId,
        ExecutionStatus.RUNNING,
      );

      // 1. Dispatch execution
      await this.actionDispatcher.dispatch(action, event, { executionId });

      // 2. Evaluate subsequent actions
      const currentIndex = targetAuto.actions.findIndex(
        (act: any) => act.id === actionId,
      );
      const nextIndex = currentIndex + 1;

      if (nextIndex < targetAuto.actions.length) {
        const nextAction = targetAuto.actions[nextIndex];

        if (nextAction.actionType === 'WAIT') {
          const payload = nextAction.payload as any;
          const delaySeconds = payload?.delaySeconds || 0;

          await this.executionRepo.createLog({
            executionId,
            level: 'INFO',
            message: `Scheduling next action (index ${nextIndex}) with wait delay: ${delaySeconds}s`,
            metadata: { nextActionId: nextAction.id },
          });

          // Transition execution status to WAITING
          await this.executionRepo.updateExecutionStatus(
            executionId,
            ExecutionStatus.WAITING,
          );

          await this.queueService.enqueueDelayAction(
            { executionId, actionId: nextAction.id, event },
            delaySeconds,
          );
        } else {
          await this.executionRepo.createLog({
            executionId,
            level: 'INFO',
            message: `Enqueuing next action immediately (index ${nextIndex})`,
            metadata: { nextActionId: nextAction.id },
          });

          await this.queueService.enqueueExecuteAction({
            executionId,
            actionId: nextAction.id,
            event,
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

        await this.executionRepo.createLog({
          executionId,
          level: 'INFO',
          message: 'Automation execution pipeline completed successfully.',
          metadata: {},
        });
      }
    } catch (error: any) {
      const isValidationError = error instanceof ValidationError;
      const isNonRetryable = error instanceof NonRetryableError;

      const attemptsAllowed = job.opts.attempts ?? 3;
      const attemptsMade = job.attemptsMade;

      const isPermanent =
        isValidationError || isNonRetryable || attemptsMade >= attemptsAllowed;

      const structuredLogContext = {
        executionId,
        automationId: targetAuto?.id || 'unknown',
        eventId: event.eventId,
        instagramAccountId: event.instagramAccountId,
        workerName: 'ActionWorker',
        isPermanent,
      };

      this.logger.error(
        `Failed to process action job ${job.id}: ${error.message || String(error)}`,
        JSON.stringify(structuredLogContext),
      );

      if (isPermanent) {
        // Move to DLQ
        await this.queueService.enqueueDlq({
          automationId: targetAuto?.id || 'unknown',
          executionId,
          eventId: event.eventId,
          failureReason: error.message || String(error),
          retryCount: attemptsMade,
          lastAttemptAt: new Date(),
        });

        this.metricsService.incrementDlq();
        this.metricsService.incrementFailure();

        await this.executionRepo.createLog({
          executionId,
          level: 'ERROR',
          message: `Action execution failed permanently. Moved to DLQ. Reason: ${error.message}`,
          metadata: { actionId, error: String(error) },
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
          message: `Action execution failed. Retrying (Attempt ${attemptsMade + 1}/${attemptsAllowed}). Reason: ${error.message}`,
          metadata: { actionId, error: String(error) },
        });

        throw error;
      }
    }
  }

  private async prismaFindExecution(executionId: string) {
    try {
      const repoPrisma = (this.executionRepo as any).prisma;
      return await repoPrisma.automationExecution.findUnique({
        where: { id: executionId },
      });
    } catch {
      return null;
    }
  }
}
