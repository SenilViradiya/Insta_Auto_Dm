import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AutomationRepository } from '../repositories/automation.repository';
import { ExecutionRepository } from '../repositories/execution.repository';
import { ConditionService } from './condition.service';
import { QueueService } from './queue.service';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { IdempotencyService } from './idempotency.service';
import { LockService } from './lock.service';
import { ExecutionStatus } from '@prisma/client';
import { MetricsService } from './metrics.service';
import { AutomationConfig } from '../config/automation.config';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly automationRepo: AutomationRepository,
    private readonly executionRepo: ExecutionRepository,
    private readonly conditionService: ConditionService,
    private readonly queueService: QueueService,
    private readonly idempotencyService: IdempotencyService,
    private readonly lockService: LockService,
    private readonly metricsService: MetricsService,
    private readonly config: AutomationConfig,
  ) {}

  async processDomainEvent(event: DomainEvent): Promise<{
    eventProcessed: boolean;
    executionsTriggered: string[];
  }> {
    const response = {
      eventProcessed: true,
      executionsTriggered: [] as string[],
    };

    // 1. Establish Correlation ID propagation
    const correlationId = event.metadata?.correlationId || randomUUID();
    if (!event.metadata) {
      event.metadata = {};
    }
    event.metadata.correlationId = correlationId;

    const structuredLogContext = {
      correlationId,
      eventId: event.eventId,
      instagramAccountId: event.instagramAccountId,
    };

    try {
      this.logger.log(
        `Received domain event with eventId: ${event.eventId} (Platform: ${event.platform}, TriggerType: ${event.eventType})`,
        JSON.stringify(structuredLogContext),
      );

      // 2. Idempotency Check
      const alreadyProcessed = await this.idempotencyService.checkProcessed(
        event.eventId,
      );
      if (alreadyProcessed) {
        this.logger.warn(
          `Event ${event.eventId} already processed. Skipping duplicate execution.`,
          JSON.stringify(structuredLogContext),
        );
        return response;
      }

      // 3. Acquire Distributed Lock and Run
      const lockKey = `automation:${event.eventId}`;
      const result = await this.lockService.runWithLock(
        lockKey,
        15000,
        async () => {
          // Double check under lock to prevent race conditions
          const marked = await this.idempotencyService.markProcessed(
            event.eventId,
            event.instagramAccountId,
          );
          if (!marked) {
            this.logger.warn(
              `Distributed race: event ${event.eventId} was marked by another thread. Skipping.`,
              JSON.stringify(structuredLogContext),
            );
            return [];
          }

          // Find matching triggers & load enabled automations for this tenant account
          const automations = await this.automationRepo.findMatchingAutomations(
            event.eventType,
            event.instagramAccountId,
          );

          this.logger.log(
            `Found ${automations.length} candidate automations candidate(s) for eventType ${event.eventType}`,
            JSON.stringify({
              ...structuredLogContext,
              count: automations.length,
            }),
          );

          const triggeredAutoIds: string[] = [];

          for (const auto of automations) {
            // Evaluate conditions
            const match = this.conditionService.evaluateConditions(
              auto.conditions,
              event,
            );

            if (!match) {
              this.logger.log(
                `Automation ${auto.id} conditions did not match. Skipping.`,
                JSON.stringify({
                  ...structuredLogContext,
                  automationId: auto.id,
                }),
              );
              continue;
            }

            // Create execution record with status QUEUED (instead of PENDING)
            const execution = await this.executionRepo.createExecution({
              automationId: auto.id,
              eventId: event.eventId,
              status: ExecutionStatus.QUEUED,
            });

            triggeredAutoIds.push(execution.id);

            // Store initial execution log propagating correlation ID in metadata
            await this.executionRepo.createLog({
              executionId: execution.id,
              level: 'INFO',
              message: `Execution ${execution.id} started for automation "${auto.name}" with status QUEUED`,
              metadata: {
                automationId: auto.id,
                eventId: event.eventId,
                instagramAccountId: event.instagramAccountId,
              },
              correlationId,
            });

            // Enqueue first action if it exists
            if (auto.actions.length > 0) {
              const firstAction = auto.actions[0];

              await this.executionRepo.createLog({
                executionId: execution.id,
                level: 'INFO',
                message: `Enqueuing first action index: 0 (Type: ${firstAction.actionType})`,
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
              // If no actions, complete execution immediately
              const startTime = new Date(execution.startedAt).getTime();
              const duration = Date.now() - startTime;

              await this.executionRepo.updateExecutionStatus(
                execution.id,
                ExecutionStatus.SUCCESS,
                new Date(),
                duration,
              );
              this.metricsService.incrementSuccess(duration);

              // Warn on slow processes
              if (duration > this.config.slowExecutionThresholdMs) {
                this.logger.warn(
                  `[SLOW EXECUTION] Execution ${execution.id} took ${duration}ms (Threshold: ${this.config.slowExecutionThresholdMs}ms)`,
                  JSON.stringify({
                    ...structuredLogContext,
                    executionId: execution.id,
                    duration,
                  }),
                );
              }

              await this.executionRepo.createLog({
                executionId: execution.id,
                level: 'INFO',
                message: `Execution completed: no actions to execute.`,
                metadata: {},
                correlationId,
              });
            }
          }

          return triggeredAutoIds;
        },
      );

      if (result) {
        response.executionsTriggered = result;
      }
    } catch (error) {
      this.logger.error(
        `Error processing domain event with eventId ${event.eventId}:`,
        error,
        JSON.stringify(structuredLogContext),
      );
      response.eventProcessed = false;
    }

    return response;
  }
}
