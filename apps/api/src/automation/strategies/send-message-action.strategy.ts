import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ActionStrategy, ActionStrategyResult } from '../interfaces/action-strategy.interface';
import { ExecutionContext } from '../interfaces/execution-context.interface';
import { MessagingService } from '../../modules/messaging/services/messaging.service';
import { VariableResolver } from '../services/variable-resolver';
import { ActionException } from '../errors/automation.errors';

@Injectable()
export class SendMessageActionStrategy implements ActionStrategy {
  readonly actionType = 'SEND_MESSAGE';
  private readonly logger = new Logger(SendMessageActionStrategy.name);

  constructor(
    private readonly variableResolver: VariableResolver,
    @Optional()
    @Inject('MessagingService')
    private readonly messagingService?: MessagingService,
  ) {}

  async execute(
    action: { id: string; actionType: string; payload: any },
    context: ExecutionContext,
  ): Promise<ActionStrategyResult> {
    const payload = action.payload || {};
    const data = payload.data || payload || {};
    const templateText = typeof data.text === 'string' ? data.text : typeof data.message === 'string' ? data.message : '';

    if (!templateText) {
      throw new ActionException(`Message text payload is empty for action ${action.id}`);
    }

    // Resolve variables template
    const resolvedText = this.variableResolver.resolve(templateText, context);

    const secureLogText =
      process.env.DEBUG_LOGGING === 'true'
        ? `"${resolvedText}"`
        : `[REDACTED message length: ${resolvedText.length}]`;

    this.logger.log(
      `[SendMessageActionStrategy] Sending message to ${context.sender.id}: ${secureLogText}`,
    );

    if (this.messagingService) {
      const result = await this.messagingService.send({
        instagramAccountId: context.instagramAccountId,
        recipientInstagramId: context.sender.id,
        messageText: resolvedText,
        messageType: 'TEXT',
        automationExecutionId: context.executionId,
        correlationId: context.metadata?.correlationId,
      });

      if (!result.success) {
        // Classify API errors: rate limit or network failures are transient retryable failures
        const isTransient =
          result.errorCode === 'RATE_LIMIT' ||
          result.errorCode === 'TIMEOUT' ||
          result.errorCode === 'API_ERROR' ||
          String(result.errorMessage).toLowerCase().includes('rate limit') ||
          String(result.errorMessage).toLowerCase().includes('timeout');

        this.logger.warn(
          `[SendMessageActionStrategy] Message dispatch failed: ${result.errorCode} - ${result.errorMessage} (transient retryable: ${isTransient})`,
        );

        return {
          retryable: isTransient,
        };
      }
    } else {
      // Stub fallback when MessagingModule is not available
      this.logger.log(`[STUB] Dispatched message to recipient "${context.sender.id}": ${secureLogText}`);
    }

    return {
      transitionToStatus: 'SUCCESS',
      retryable: false,
    };
  }
}
