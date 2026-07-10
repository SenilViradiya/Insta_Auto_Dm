import { Injectable, Logger } from '@nestjs/common';
import { ExecutionStatus } from '@prisma/client';
import { ExecutionRepository } from '../repositories/execution.repository';
import { AutomationRepository } from '../repositories/automation.repository';
import { ConditionEngine } from './condition-engine';
import { QueueService } from './queue.service';
import { ActionStrategyResolver } from './action-strategy.resolver';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { ExecutionContext } from '../interfaces/execution-context.interface';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { ExecutionException, ActionException, NonRetryableException, RetryException } from '../errors/automation.errors';
import { MetricsService } from './metrics.service';
import { AutomationConfig } from '../config/automation.config';

@Injectable()
export class ExecutionEngine {
  private readonly logger = new Logger(ExecutionEngine.name);

  constructor(
    private readonly executionRepo: ExecutionRepository,
    private readonly automationRepo: AutomationRepository,
    private readonly conditionEngine: ConditionEngine,
    private readonly queueService: QueueService,
    private readonly actionStrategyResolver: ActionStrategyResolver,
    private readonly metricsService: MetricsService,
    private readonly config: AutomationConfig,
  ) {}

  /**
   * Evaluates conditions and initiates execution.
   */
  async startExecution(
    automation: AutomationModel,
    event: DomainEvent,
  ): Promise<string | null> {
    const correlationId = event.metadata?.correlationId;
    this.logger.log(
      `[ExecutionEngine] Starting execution evaluation for automation: "${automation.name}" (${automation.id})`,
      JSON.stringify({ correlationId, eventId: event.eventId }),
    );

    // 1. Evaluate filter conditions
    const flatConditions = (automation.conditions || []).map((cond) => ({
      field: cond.field,
      operator: cond.operator,
      value: cond.value,
    }));

    const conditionResult = this.conditionEngine.evaluateFlat(
      flatConditions,
      event,
    );

    if (!conditionResult.matched) {
      this.logger.log(
        `[ExecutionEngine] Automation ${automation.id} filter conditions did not match. Skipping execution.`,
        JSON.stringify({ correlationId, reason: conditionResult.reason }),
      );
      return null;
    }

    // 2. Create the Execution Record
    const execution = await this.executionRepo.createExecution({
      automationId: automation.id,
      eventId: event.eventId,
      status: ExecutionStatus.QUEUED,
    });

    // 3. Log execution started
    await this.executionRepo.createLog({
      executionId: execution.id,
      level: 'INFO',
      message: `Execution pipeline initialized with status QUEUED (Automation: "${automation.name}")`,
      metadata: {
        automationId: automation.id,
        eventId: event.eventId,
        instagramAccountId: event.instagramAccountId,
      },
      correlationId,
    });

    // 4. Enqueue first action in pipeline
    if (automation.actions && automation.actions.length > 0) {
      const firstAction = automation.actions[0];
      await this.executionRepo.createLog({
        executionId: execution.id,
        level: 'INFO',
        message: `Enqueuing first action step: ${firstAction.actionType} (Index: 0)`,
        metadata: { actionId: firstAction.id },
        correlationId,
      });

      await this.queueService.enqueueExecuteAction({
        executionId: execution.id,
        actionId: firstAction.id,
        event,
        correlationId,
      });
    } else {
      // Complete immediately if no actions exist
      await this.executionRepo.updateExecutionStatus(
        execution.id,
        ExecutionStatus.SUCCESS,
        new Date(),
        0,
      );

      await this.executionRepo.createLog({
        executionId: execution.id,
        level: 'INFO',
        message: 'No actions to execute. Pipeline marked completed.',
        metadata: {},
        correlationId,
      });
    }

    return execution.id;
  }

  /**
   * Executes a specific action step.
   */
  async executeStep(
    executionId: string,
    actionId: string,
    event: DomainEvent,
    correlationId?: string,
  ): Promise<void> {
    const allAutomations = await this.automationRepo.findMany({});
    const targetAuto = allAutomations.items.find((auto) =>
      auto.actions.some((act) => act.id === actionId),
    ) || null;

    if (!targetAuto) {
      throw new ExecutionException(
        `Automation containing action step ${actionId} not found`,
      );
    }

    const action = targetAuto.actions.find((act) => act.id === actionId);
    if (!action) {
      throw new ActionException(`Action step ${actionId} not found`);
    }

    // 1. Compile Strongly-Typed ExecutionContext
    const context: ExecutionContext = {
      executionId,
      workspaceId: targetAuto.workspaceId || undefined,
      instagramAccountId: event.instagramAccountId,
      automationId: targetAuto.id,
      triggerType: targetAuto.triggerType as any,
      triggerPayload: event,
      sender: {
        id: event.senderId,
        username: event.content?.username || event.content?.senderUsername || undefined,
      },
      recipient: {
        id: event.recipientId,
      },
      variables: {
        'user.username': event.content?.username || event.content?.senderUsername || 'User',
        'comment.text': event.content?.text || '',
        'reel.caption': event.content?.caption || '',
        'current_time': new Date().toISOString(),
      },
      metadata: {
        correlationId,
      },
      timestamp: new Date(),
    };

    // Log action execution started
    await this.executionRepo.createLog({
      executionId,
      level: 'INFO',
      message: `Executing action: ${action.actionType}`,
      metadata: { actionId, payload: action.payload },
      correlationId,
    });

    // Update execution status to RUNNING
    await this.executionRepo.updateExecutionStatus(
      executionId,
      ExecutionStatus.RUNNING,
    );

    // 2. Resolve and evaluate action strategy
    const strategy = this.actionStrategyResolver.resolve(action.actionType);
    const result = await strategy.execute(
      {
        id: action.id,
        actionType: action.actionType,
        payload: action.payload,
      },
      context,
    );
    if (result.retryable !== undefined) {
      if (result.retryable) {
        throw new RetryException(`Strategy execution failed with a retryable error`);
      } else {
        throw new NonRetryableException(`Strategy execution failed permanently`);
      }
    }

    // 3. Move to next step or handle wait timers
    if (result.transitionToStatus === 'WAITING') {
      await this.executionRepo.createLog({
        executionId,
        level: 'INFO',
        message: `Action requested WAITING state. Transitioning execution to WAITING.`,
        metadata: { actionId },
        correlationId,
      });

      await this.executionRepo.updateExecutionStatus(
        executionId,
        ExecutionStatus.WAITING,
      );
      return;
    }

    // Evaluate subsequent actions
    const currentIndex = targetAuto.actions.findIndex((act) => act.id === actionId);
    const nextIndex = currentIndex + 1;

    if (nextIndex < targetAuto.actions.length) {
      const nextAction = targetAuto.actions[nextIndex];

      if (nextAction.actionType === 'WAIT') {
        const payload = nextAction.payload || {};
        const data = payload.data || payload || {};
        const delaySeconds = typeof data.delaySeconds === 'number' ? data.delaySeconds : 0;

        await this.executionRepo.createLog({
          executionId,
          level: 'INFO',
          message: `Scheduling next action: WAIT (Index: ${nextIndex}, delay: ${delaySeconds}s)`,
          metadata: { nextActionId: nextAction.id },
          correlationId,
        });

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
          message: `Enqueuing next action: ${nextAction.actionType} (Index: ${nextIndex})`,
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
      // All steps executed, compile metrics and transition to SUCCESS
      const record = await this.prismaFindExecution(executionId);
      const duration = record ? Date.now() - new Date(record.startedAt).getTime() : 0;

      await this.executionRepo.updateExecutionStatus(
        executionId,
        ExecutionStatus.SUCCESS,
        new Date(),
        duration,
      );

      this.metricsService.incrementSuccess(duration);

      if (duration > this.config.slowExecutionThresholdMs) {
        this.logger.warn(
          `[SLOW EXECUTION] Execution ${executionId} pipeline completed in ${duration}ms (Threshold: ${this.config.slowExecutionThresholdMs}ms)`,
        );
      }

      await this.executionRepo.createLog({
        executionId,
        level: 'INFO',
        message: 'Automation execution completed successfully.',
        metadata: { durationMs: duration },
        correlationId,
      });
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
