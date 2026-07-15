import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import {
  ActionStrategy,
  ActionStrategyResult,
} from '../interfaces/action-strategy.interface';
import { ExecutionContext } from '../interfaces/execution-context.interface';
import { MessagingService } from '../../modules/messaging/services/messaging.service';
import { VariableResolver } from '../services/variable-resolver';
import { ActionException } from '../errors/automation.errors';

@Injectable()
export class ReplyCommentActionStrategy implements ActionStrategy {
  readonly actionType = 'REPLY_COMMENT';
  private readonly logger = new Logger(ReplyCommentActionStrategy.name);

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
    const templateText =
      typeof data.text === 'string'
        ? data.text
        : typeof data.message === 'string'
          ? data.message
          : '';

    if (!templateText) {
      throw new ActionException(
        `Comment reply text payload is empty for action ${action.id}`,
      );
    }

    // Resolve variables template
    const resolvedText = context.resolveVariable
      ? context.resolveVariable(templateText)
      : this.variableResolver.resolve(templateText, context);

    const commentId =
      context.triggerPayload?.eventId || context.triggerPayload?.id;
    if (!commentId) {
      throw new ActionException(
        `No valid comment ID found in event context for comment reply`,
      );
    }

    const secureLogText =
      process.env.DEBUG_LOGGING === 'true'
        ? `"${resolvedText}"`
        : `[REDACTED comment reply length: ${resolvedText.length}]`;

    this.logger.log(
      `[ReplyCommentActionStrategy] Sending public reply to comment "${commentId}": ${secureLogText}`,
    );

    if (this.messagingService) {
      const result = await this.messagingService.sendPublicReply({
        instagramAccountId: context.instagramAccountId,
        commentId,
        messageText: resolvedText,
        automationExecutionId: context.executionId,
        correlationId: context.metadata?.correlationId,
      });

      if (!result.success) {
        const isTransient =
          result.errorCode === 'RATE_LIMIT' ||
          result.errorCode === 'TIMEOUT' ||
          result.errorCode === 'API_ERROR' ||
          String(result.errorMessage).toLowerCase().includes('rate limit') ||
          String(result.errorMessage).toLowerCase().includes('timeout');

        this.logger.warn(
          `[ReplyCommentActionStrategy] Public reply dispatch failed: ${result.errorCode} - ${result.errorMessage} (transient retryable: ${isTransient})`,
        );

        return {
          retryable: isTransient,
        };
      }
    } else {
      // Stub fallback when MessagingModule is not available
      this.logger.log(
        `[STUB] Dispatched public reply to comment "${commentId}": ${secureLogText}`,
      );
    }

    return {
      transitionToStatus: 'SUCCESS',
      retryable: false,
    };
  }
}
