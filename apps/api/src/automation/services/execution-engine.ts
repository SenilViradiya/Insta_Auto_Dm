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
import {
  ExecutionException,
  ActionException,
  NonRetryableException,
  RetryException,
} from '../errors/automation.errors';
import { MetricsService } from './metrics.service';
import { AutomationConfig } from '../config/automation.config';
import { VariableResolver } from './variable-resolver';

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
    private readonly variableResolver: VariableResolver,
  ) {}

  private getRuntimeActions(
    automation: AutomationModel,
  ): Array<{ id: string; actionType: string; payload: any }> {
    const list = [...(automation.actions || [])].map((act) => ({
      id: act.id,
      actionType: act.actionType as string,
      payload: act.payload,
    }));

    const hasReplyComment = list.some((act) => act.actionType === 'REPLY_COMMENT');

    if (
      !hasReplyComment &&
      automation.triggerConfig?.publicReply &&
      (automation.triggerType === 'REEL_COMMENT' ||
        automation.triggerType === 'POST_COMMENT')
    ) {
      list.unshift({
        id: `virtual-reply-${automation.id}`,
        actionType: 'REPLY_COMMENT',
        payload: { data: { text: automation.triggerConfig.publicReply } },
      });
    }
    return list;
  }

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

    this.logger.log(
      `[Conditions passed] Automation ${automation.id} filter conditions passed.`,
      JSON.stringify({ correlationId, eventId: event.eventId }),
    );

    // 2. Create the Execution Record
    const execution = await this.executionRepo.createExecution({
      automationId: automation.id,
      eventId: event.eventId,
      status: ExecutionStatus.QUEUED,
    });

    // 3. Log trigger matching and execution metadata
    await this.executionRepo.createLog({
      executionId: execution.id,
      level: 'INFO',
      message: `[Trigger matched] Execution pipeline initialized with status QUEUED (Automation: "${automation.name}")`,
      metadata: {
        triggerMatched: true,
        matchedKeyword: event.metadata?.matchedKeywords || [],
        selectedReel: automation.triggerConfig?.mediaId || null,
        commentId: event.eventId,
        dmStatus: 'QUEUED',
        automationId: automation.id,
        eventId: event.eventId,
        instagramAccountId: event.instagramAccountId,
      },
      correlationId,
    });

    const runtimeActions = this.getRuntimeActions(automation);

    // 4. Enqueue first action in pipeline
    if (runtimeActions.length > 0) {
      const firstAction = runtimeActions[0];
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
    const allAutomations = await this.automationRepo.findMany({
      instagramAccountId: event.instagramAccountId,
    });

    let targetAuto: AutomationModel | null = null;
    let action: any = null;

    for (const auto of allAutomations.items) {
      const acts = this.getRuntimeActions(auto);
      const found = acts.find((act) => act.id === actionId);
      if (found) {
        targetAuto = auto;
        action = found;
        break;
      }
    }

    if (!targetAuto) {
      throw new ExecutionException(
        `Automation containing action step ${actionId} not found`,
      );
    }

    if (!action) {
      throw new ActionException(`Action step ${actionId} not found`);
    }

    // Resolve reel / media caption if present
    let caption = event.content?.caption || '';
    if (!caption) {
      const mediaId = event.content?.mediaId || event.content?.media_id;
      if (mediaId) {
        try {
          const repoPrisma = (this.executionRepo as any).prisma;
          const asset = await repoPrisma.instagramAsset.findFirst({
            where: {
              instagramAccountId: event.instagramAccountId,
              instagramMediaId: mediaId,
            },
          });
          if (asset?.caption) {
            caption = asset.caption;
          }
        } catch (err: any) {
          this.logger.warn(
            `Could not resolve reel caption from database: ${err.message}`,
            err.stack,
          );
        }
      }
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
        username:
          event.content?.username || event.content?.senderUsername || undefined,
      },
      recipient: {
        id: event.recipientId,
      },
      variables: {
        'user.username':
          event.content?.username || event.content?.senderUsername || 'User',
        'comment.text': event.content?.text || '',
        'reel.caption': caption,
        current_time: new Date().toISOString(),
      },
      metadata: {
        correlationId,
      },
      timestamp: new Date(),
    };

    // Attach runtime variable resolver
    context.resolveVariable = (template: string) => {
      return this.variableResolver.resolve(template, context);
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

    // Only throw retry/non-retry if the step was not completed successfully or transitioning to waiting/timer
    if (
      result.transitionToStatus !== 'SUCCESS' &&
      result.transitionToStatus !== 'WAITING'
    ) {
      if (result.retryable) {
        throw new RetryException(
          `Strategy execution failed with a retryable error`,
        );
      } else {
        throw new NonRetryableException(
          `Strategy execution failed permanently`,
        );
      }
    }

    // 3. Move to next step or handle wait timers
    const runtimeActions = this.getRuntimeActions(targetAuto);
    const currentIndex = runtimeActions.findIndex((act) => act.id === actionId);
    const nextIndex = currentIndex + 1;
    const hasNext = nextIndex < runtimeActions.length;

    if (result.transitionToStatus === 'WAITING') {
      const delaySeconds = result.delaySeconds || 0;

      await this.executionRepo.createLog({
        executionId,
        level: 'INFO',
        message: `Action requested WAITING state. Transitioning execution to WAITING.`,
        metadata: { actionId, delaySeconds },
        correlationId,
      });

      await this.executionRepo.updateExecutionStatus(
        executionId,
        ExecutionStatus.WAITING,
      );

      if (hasNext) {
        const nextAction = runtimeActions[nextIndex];
        await this.executionRepo.createLog({
          executionId,
          level: 'INFO',
          message: `Scheduling next action with delay: ${nextAction.actionType} (Index: ${nextIndex}, delay: ${delaySeconds}s)`,
          metadata: { nextActionId: nextAction.id },
          correlationId,
        });

        await this.queueService.enqueueDelayAction(
          { executionId, actionId: nextAction.id, event, correlationId },
          delaySeconds,
        );
      }
      return;
    }

    this.logger.log(
      `[Actions executed] Executed action strategy ${action.actionType} for execution: ${executionId}`,
      JSON.stringify({ correlationId, executionId, actionId }),
    );

    if (hasNext) {
      const nextAction = runtimeActions[nextIndex];

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
    } else {
      // All steps executed, compile metrics and transition to SUCCESS
      const record = await this.prismaFindExecution(executionId);
      const duration = record
        ? Date.now() - new Date(record.startedAt).getTime()
        : 0;

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

      this.logger.log(
        `[Execution completed] Automation execution completed successfully.`,
        JSON.stringify({ correlationId, executionId, durationMs: duration }),
      );

      await this.executionRepo.createLog({
        executionId,
        level: 'INFO',
        message:
          '[Execution completed] Automation execution completed successfully.',
        metadata: {
          durationMs: duration,
          dmStatus: 'SENT',
        },
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
