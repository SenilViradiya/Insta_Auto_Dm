import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AutomationRepository } from '../repositories/automation.repository';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { IdempotencyService } from './idempotency.service';
import { LockService } from './lock.service';
import { TriggerResolver } from './trigger.resolver';
import { ExecutionEngine } from './execution-engine';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly automationRepo: AutomationRepository,
    private readonly idempotencyService: IdempotencyService,
    private readonly lockService: LockService,
    private readonly triggerResolver: TriggerResolver,
    private readonly executionEngine: ExecutionEngine,
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
    const correlationId = String(event.metadata?.correlationId || randomUUID());
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
            // Evaluate trigger strategy
            if (!auto.triggerType) {
              this.logger.warn(
                `Automation ${auto.id} has no triggerType set. Skipping.`,
                JSON.stringify({
                  ...structuredLogContext,
                  automationId: auto.id,
                }),
              );
              continue;
            }

            try {
              const strategy = this.triggerResolver.resolve(auto.triggerType as any);
              const triggerResult = strategy.matchesEvent({
                automation: auto,
                event,
                currentTime: new Date(),
                workspaceId: auto.workspaceId,
              });

              if (!triggerResult.matched) {
                this.logger.log(
                  `Automation ${auto.id} trigger did not match. Reason: ${triggerResult.reason}`,
                  JSON.stringify({
                    ...structuredLogContext,
                    automationId: auto.id,
                  }),
                );
                continue;
              }

              this.logger.log(
                `[Trigger matched] Automation ${auto.id} trigger matches event: ${triggerResult.reason}`,
                JSON.stringify({
                  ...structuredLogContext,
                  automationId: auto.id,
                }),
              );

              // Propagate keyword match details
              event.metadata = event.metadata || {};
              event.metadata.matchedKeywords = triggerResult.matchedConditions || [];
            } catch (err: any) {
              this.logger.error(
                `Error evaluating trigger strategy for automation ${auto.id}: ${err.message}`,
                JSON.stringify({
                  ...structuredLogContext,
                  automationId: auto.id,
                }),
              );
              continue;
            }

            // Route matching automation to ExecutionEngine
            const execId = await this.executionEngine.startExecution(auto, event);
            if (execId) {
              triggeredAutoIds.push(execId);
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
