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

import { TokenService } from '../../modules/meta-platform/services/token.service';
import { MessagingService as MetaMessagingService } from '../../modules/meta-platform/services/messaging.service';

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
    private readonly tokenService: TokenService,
    private readonly metaMessagingService: MetaMessagingService,
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

    // 3. Optional Public Reply
    let publicReplyStatus = 'SKIPPED';
    if (automation.triggerConfig?.publicReply && event.eventType === 'REEL_COMMENT') {
      try {
        const token = await this.tokenService.getToken(event.instagramAccountId);
        await this.metaMessagingService.sendPublicReply(
          event.eventId, // comment ID is eventId
          automation.triggerConfig.publicReply,
          token,
        );
        publicReplyStatus = 'SUCCESS';
      } catch (err: any) {
        publicReplyStatus = 'FAILED';
        this.logger.error(
          `Failed to dispatch public reply: ${err.message}`,
          JSON.stringify({ correlationId, eventId: event.eventId }),
        );
      }
    }

    // 4. Log trigger matching and execution metadata
    await this.executionRepo.createLog({
      executionId: execution.id,
      level: 'INFO',
      message: `[Trigger matched] Execution pipeline initialized with status QUEUED (Automation: "${automation.name}")`,
      metadata: {
        triggerMatched: true,
        matchedKeyword: event.metadata?.matchedKeywords || [],
        selectedReel: automation.triggerConfig?.mediaId || null,
        commentId: event.eventId,
        publicReplyStatus,
        dmStatus: 'QUEUED',
        automationId: automation.id,
        eventId: event.eventId,
        instagramAccountId: event.instagramAccountId,
      },
      correlationId,
    });

    // 5. Enqueue first action in pipeline
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
    const allAutomations = await this.automationRepo.findMany({
      instagramAccountId: event.instagramAccountId,
    });
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
          this.logger.warn(`Could not resolve reel caption from database: ${err.message}`, err.stack);
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
        username: event.content?.username || event.content?.senderUsername || undefined,
      },
      recipient: {
        id: event.recipientId,
      },
      variables: {
        'user.username': event.content?.username || event.content?.senderUsername || 'User',
        'comment.text': event.content?.text || '',
        'reel.caption': caption,
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

    // Only throw retry/non-retry if the step was not completed successfully or transitioning to waite-timer
    if (result.transitionToStatus !== 'SUCCESS' && result.transitionToStatus !== 'WAITING') {
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

    this.logger.log(
      `[Actions executed] Executed action strategy ${action.actionType} for execution: ${executionId}`,
      JSON.stringify({ correlationId, executionId, actionId }),
    );

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
          executionId: nextAction.id,
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

      this.logger.log(
        `[Execution completed] Automation execution completed successfully.`,
        JSON.stringify({ correlationId, executionId, durationMs: duration }),
      );

      await this.executionRepo.createLog({
        executionId,
        level: 'INFO',
        message: '[Execution completed] Automation execution completed successfully.',
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
