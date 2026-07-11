import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
  Req,
} from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { AutomationService } from '../automation/services/automation.service';
import { DomainEvent } from '../automation/interfaces/domain-event.interface';
import * as crypto from 'crypto';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger('WebhookController');

  constructor(private readonly automationService: AutomationService) {}

  @Get()
  verify(@Query() query: Record<string, string>): string {
    this.logger.log(`Received Meta Webhook Verification: ${JSON.stringify(query)}`);

    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const expectedToken =
      process.env.META_VERIFY_TOKEN || 'instagram_dm_webhook_verify_token';

    if (mode === 'subscribe' && token === expectedToken) {
      this.logger.log('Webhook challenge verified successfully.');
      return challenge;
    }

    this.logger.error('Webhook verification failed: token mismatch or invalid mode.');
    throw new ForbiddenException('Verification failed');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleEvent(@Body() payload: any, @Req() req?: any) {
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest) {
      const signature = req.headers?.['x-hub-signature-256'] as string;
      if (!signature) {
        this.logger.error('Missing X-Hub-Signature-256 header');
        throw new ForbiddenException('Missing signature');
      }

      const parts = signature.split('=');
      if (parts.length !== 2 || parts[0] !== 'sha256') {
        this.logger.error('Invalid signature format');
        throw new ForbiddenException('Invalid signature format');
      }

      const expectedSignature = parts[1];
      const appSecret = process.env.META_APP_SECRET;
      if (!appSecret) {
        this.logger.error('META_APP_SECRET is not configured');
        throw new ForbiddenException('Server configuration error');
      }

      const rawBody = req.rawBody;
      if (!rawBody) {
        this.logger.error('Raw body not available for signature verification');
        throw new ForbiddenException('Verification error');
      }

      const hmac = crypto.createHmac('sha256', appSecret);
      hmac.update(rawBody);
      const calculatedSignature = hmac.digest('hex');

      if (calculatedSignature !== expectedSignature) {
        this.logger.error('HMAC signature mismatch');
        throw new ForbiddenException('Signature verification failed');
      }
    }

    this.logger.log(`Received Meta Webhook Event: ${JSON.stringify(payload)}`);

    if (payload.object !== 'instagram') {
      this.logger.warn(`Unsupported webhook event object type: ${payload.object}`);
      return { success: false, message: 'Unsupported object' };
    }

    const entries = payload.entry || [];
    for (const entry of entries) {
      const recipientId = entry.id; // Instagram Business Account ID

      // 1. Handle DMs (entry.messaging)
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        const senderId = event.sender?.id;
        const eventRecipientId = event.recipient?.id;
        const timestamp = event.timestamp;

        if (event.message) {
          const messageId = event.message.mid;
          const text = event.message.text;

          this.logger.log(
            `[Webhook received] Parsed Instagram Message Event:
             - Sender ID: ${senderId}
             - Recipient ID: ${eventRecipientId} (Biz: ${recipientId})
             - Message ID: ${messageId}
             - Timestamp: ${timestamp}
             - Text: "${text}"`
          );

          if (!senderId || !eventRecipientId || !messageId || text === undefined) {
            this.logger.error('Payload validation failed: senderId, recipientId, messageId, or text is missing.');
            continue;
          }

          const domainEvent: DomainEvent = {
            eventId: messageId,
            instagramAccountId: recipientId,
            platform: 'instagram',
            eventType: TriggerType.DIRECT_MESSAGE,
            senderId,
            recipientId: eventRecipientId,
            content: {
              text,
              messageId,
            },
            timestamp: new Date(timestamp),
            metadata: {
              correlationId: messageId,
            },
          };

          this.logger.log(`Pipeline Triggered - Forwarding Domain Event: ${JSON.stringify(domainEvent)}`);

          try {
            await this.automationService.processDomainEvent(domainEvent);
          } catch (error) {
            this.logger.error(`Failed to process webhook event: ${(error as Error).message}`);
          }
        }
      }

      // 2. Handle Comments on Reels/Media (entry.changes)
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'comments') {
          const value = change.value;
          if (!value) continue;

          const commentId = value.id;
          const text = value.text;
          const senderId = value.from?.id; // commentator Instagram account
          const senderUsername = value.from?.username;
          const mediaId = value.media?.id || value.media_id;
          const mediaProductType = value.media?.media_product_type;
          const timestamp = entry.time ? entry.time * 1000 : Date.now();

          this.logger.log(
            `[Webhook received] Parsed Instagram Comment Event:
             - Comment ID: ${commentId}
             - Media ID: ${mediaId}
             - Media Product Type: ${mediaProductType}
             - Sender: ${senderUsername} (${senderId})
             - Text: "${text}"`
          );

          if (!senderId || !commentId || text === undefined) {
            this.logger.error('Payload validation failed: senderId, commentId, or text is missing.');
            continue;
          }

          const domainEvent: DomainEvent = {
            eventId: commentId,
            instagramAccountId: recipientId,
            platform: 'instagram',
            eventType: TriggerType.REEL_COMMENT,
            senderId,
            recipientId,
            content: {
              text,
              mediaId,
              media_id: mediaId,
              username: senderUsername,
              senderUsername,
              commentId,
              caption: value.media?.caption, // Pass along if provided by webhook mock
            },
            timestamp: new Date(timestamp),
            metadata: {
              correlationId: commentId,
            },
          };

          this.logger.log(`Pipeline Triggered - Forwarding Comment Domain Event: ${JSON.stringify(domainEvent)}`);

          try {
            await this.automationService.processDomainEvent(domainEvent);
          } catch (error) {
            this.logger.error(`Failed to process webhook comment event: ${(error as Error).message}`);
          }
        }
      }
    }

    return { success: true };
  }
}

