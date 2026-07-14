import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OutboundMessageStatus } from '@prisma/client';
import { MessagingConfig } from '../config/messaging.config';
import { TokenService } from '../token/token.service';
import { MetaRateLimiterService } from '../rate-limit/rate-limiter.service';
import { MetaGraphClient } from '../clients/meta-graph.client';
import { MessageRepository } from '../repositories/message.repository';
import { MessagingMetricsService } from '../metrics/messaging-metrics.service';
import { validateSendMessage } from '../validators/message.validator';
import {
  SendMessageRequest,
  MessagingResult,
} from '../interfaces/messaging.interfaces';
import {
  MessagingException,
  TokenExpiredException,
  RateLimitException,
  NetworkException,
} from '../exceptions/messaging.exceptions';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly config: MessagingConfig,
    private readonly tokenService: TokenService,
    private readonly rateLimiter: MetaRateLimiterService,
    private readonly graphClient: MetaGraphClient,
    private readonly messageRepo: MessageRepository,
    private readonly metrics: MessagingMetricsService,
  ) { }

  async send(request: SendMessageRequest): Promise<MessagingResult> {
    const correlationId = request.correlationId || randomUUID();
    const startTime = Date.now();

    const logContext = {
      correlationId,
      instagramAccountId: request.instagramAccountId,
      recipientId: request.recipientInstagramId,
      executionId: request.automationExecutionId,
    };

    try {
      // 1. Validate message payload
      const validated = validateSendMessage({
        ...request,
        correlationId,
      });

      this.logger.log(`Processing send request`, JSON.stringify(logContext));

      // 2. Persist as QUEUED
      const message = await this.messageRepo.create({
        instagramAccountId: validated.instagramAccountId,
        recipientInstagramId: validated.recipientInstagramId,
        messageText: validated.messageText,
        messageType: validated.messageType,
        automationExecutionId: validated.automationExecutionId,
        correlationId,
      });

      // 3. Load access token (cached + decrypted)
      let accessToken: string;
      try {
        accessToken = await this.tokenService.getToken(
          validated.instagramAccountId,
        );
      } catch (err) {
        if (err instanceof TokenExpiredException) {
          this.metrics.incrementTokenError();
        }
        await this.handleFailure(message.id, err, startTime, logContext);
        throw err;
      }

      // 4. Rate limit check
      try {
        await this.rateLimiter.acquire(validated.instagramAccountId);
      } catch (err) {
        if (err instanceof RateLimitException) {
          this.metrics.incrementRateLimitHit();
        }
        await this.handleFailure(message.id, err, startTime, logContext);
        throw err;
      }

      // 5. Update status -> SENDING
      await this.messageRepo.updateStatus(
        message.id,
        OutboundMessageStatus.SENDING,
      );

      // 6. Send via Meta Graph API with retries
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const result = await this.graphClient.sendMessage(
            validated.recipientInstagramId,
            validated.messageText,
            accessToken,
          );

          // Success
          const durationMs = Date.now() - startTime;
          await this.messageRepo.updateStatus(
            message.id,
            OutboundMessageStatus.SENT,
            {
              metaMessageId: result.messageId,
              sentAt: new Date(),
            },
          );

          this.metrics.incrementSent(durationMs);

          this.logger.log(
            `Message sent successfully in ${durationMs}ms`,
            JSON.stringify({
              ...logContext,
              metaMessageId: result.messageId,
              durationMs,
              attempt,
            }),
          );

          return {
            success: true,
            messageId: message.id,
            metaMessageId: result.messageId,
            durationMs,
          };
        } catch (err: unknown) {
          lastError = err;

          // Non-retryable errors — bail immediately
          if (
            err instanceof TokenExpiredException ||
            (err instanceof MessagingException &&
              !(err instanceof NetworkException) &&
              !(err instanceof RateLimitException))
          ) {
            break;
          }

          // Retryable — increment and wait
          if (attempt < this.config.retryAttempts) {
            this.metrics.incrementRetry();
            await this.messageRepo.incrementRetry(message.id);
            const delay = this.config.retryDelayMs * Math.pow(2, attempt);
            this.logger.warn(
              `Retry ${attempt + 1}/${this.config.retryAttempts} in ${delay}ms`,
              JSON.stringify(logContext),
            );
            await this.sleep(delay);
          }
        }
      }

      // All retries exhausted
      await this.handleFailure(message.id, lastError, startTime, logContext);

      if (lastError instanceof NetworkException) {
        this.metrics.incrementNetworkError();
      }

      const durationMs = Date.now() - startTime;
      return {
        success: false,
        messageId: message.id,
        errorCode: (lastError as Error)?.name || 'UNKNOWN',
        errorMessage: (lastError as Error)?.message || 'Unknown error',
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      this.metrics.incrementFailed();

      this.logger.error(
        `Message send failed: ${(err as Error).message}`,
        JSON.stringify(logContext),
      );

      return {
        success: false,
        errorCode: (err as Error)?.name || 'UNKNOWN',
        errorMessage: (err as Error)?.message || 'Unknown error',
        durationMs,
      };
    }
  }

  async sendPublicReply(request: {
    instagramAccountId: string;
    commentId: string;
    messageText: string;
    automationExecutionId?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; replyId?: string; errorCode?: string; errorMessage?: string; durationMs: number }> {
    const correlationId = request.correlationId || randomUUID();
    const startTime = Date.now();

    const logContext = {
      correlationId,
      instagramAccountId: request.instagramAccountId,
      commentId: request.commentId,
      executionId: request.automationExecutionId,
    };

    try {
      this.logger.log(`Processing sendPublicReply request`, JSON.stringify(logContext));

      // Load access token
      const accessToken = await this.tokenService.getToken(request.instagramAccountId);

      // Rate limit check
      await this.rateLimiter.acquire(request.instagramAccountId);

      // Send via Graph Client
      const result = await this.graphClient.sendPublicReply(
        request.commentId,
        request.messageText,
        accessToken,
      );

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `Public reply sent successfully in ${durationMs}ms`,
        JSON.stringify({
          ...logContext,
          replyId: result.replyId,
          durationMs,
        }),
      );

      return {
        success: true,
        replyId: result.replyId,
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      this.logger.error(
        `Public reply failed: ${(err as Error).message}`,
        JSON.stringify(logContext),
      );

      return {
        success: false,
        errorCode: (err as Error)?.name || 'UNKNOWN',
        errorMessage: (err as Error)?.message || 'Unknown error',
        durationMs,
      };
    }
  }

  private async handleFailure(
    messageId: string,
    error: unknown,
    startTime: number,
    logContext: Record<string, any>,
  ): Promise<void> {
    this.metrics.incrementFailed();

    await this.messageRepo.updateStatus(
      messageId,
      OutboundMessageStatus.FAILED,
      {
        errorCode: (error as Error)?.name || 'UNKNOWN',
        errorMessage: (error as Error)?.message
          ? (error as Error).message.substring(0, 500)
          : 'Unknown error',
        failedAt: new Date(),
      },
    );

    this.logger.error(
      `Message ${messageId} failed: ${(error as Error)?.message || 'Unknown'}`,
      JSON.stringify(logContext),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
