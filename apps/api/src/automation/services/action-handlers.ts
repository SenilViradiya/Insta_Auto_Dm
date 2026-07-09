import { Injectable, Logger } from '@nestjs/common';
import { AutomationAction } from '@prisma/client';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { ExecutionRepository } from '../repositories/execution.repository';
import { normalizePayload } from '../dto/action-payload.validator';

export interface AutomationActionHandler {
  execute(
    action: AutomationAction,
    event: DomainEvent,
    context: { executionId: string },
  ): Promise<void>;
}

@Injectable()
export class SendMessageActionHandler implements AutomationActionHandler {
  private readonly logger = new Logger(SendMessageActionHandler.name);

  constructor(private readonly executionRepo: ExecutionRepository) {}

  async execute(
    action: AutomationAction,
    event: DomainEvent,
    context: { executionId: string },
  ): Promise<void> {
    const payload = normalizePayload(action.actionType, action.payload);
    const messageText = payload.data.text || payload.data.message || '';

    // Log detail without displaying the raw message content (unless debug logging is on)
    const secureLogText =
      process.env.DEBUG_LOGGING === 'true'
        ? `"${messageText}"`
        : `[REDACTED message length: ${messageText.length}]`;

    this.logger.log(
      `[SendMessageActionHandler] Sending message to ${event.senderId}: ${secureLogText}`,
    );

    await this.executionRepo.createLog({
      executionId: context.executionId,
      level: 'INFO',
      message: `Dispatched message to recipient "${event.senderId}": ${secureLogText}`,
      metadata: { actionId: action.id, payload },
    });
  }
}

@Injectable()
export class WaitActionHandler implements AutomationActionHandler {
  private readonly logger = new Logger(WaitActionHandler.name);

  constructor(private readonly executionRepo: ExecutionRepository) {}

  async execute(
    action: AutomationAction,
    event: DomainEvent,
    context: { executionId: string },
  ): Promise<void> {
    const payload = normalizePayload(action.actionType, action.payload);
    const delaySeconds = payload.data.delaySeconds || 0;
    this.logger.log(`[WaitActionHandler] Waiting for ${delaySeconds} seconds`);

    await this.executionRepo.createLog({
      executionId: context.executionId,
      level: 'INFO',
      message: `Enqueued wait action delay: ${delaySeconds} seconds`,
      metadata: { actionId: action.id, delaySeconds },
    });
  }
}

@Injectable()
export class AddTagActionHandler implements AutomationActionHandler {
  private readonly logger = new Logger(AddTagActionHandler.name);

  constructor(private readonly executionRepo: ExecutionRepository) {}

  async execute(
    action: AutomationAction,
    event: DomainEvent,
    context: { executionId: string },
  ): Promise<void> {
    const payload = normalizePayload(action.actionType, action.payload);
    const tag = payload.data.tag || '';
    this.logger.log(
      `[AddTagActionHandler] Adding tag "${tag}" for user ${event.senderId}`,
    );

    await this.executionRepo.createLog({
      executionId: context.executionId,
      level: 'INFO',
      message: `Added user profile tag: "${tag}"`,
      metadata: { actionId: action.id, tag },
    });
  }
}

@Injectable()
export class CallWebhookActionHandler implements AutomationActionHandler {
  private readonly logger = new Logger(CallWebhookActionHandler.name);

  constructor(private readonly executionRepo: ExecutionRepository) {}

  async execute(
    action: AutomationAction,
    event: DomainEvent,
    context: { executionId: string },
  ): Promise<void> {
    const payload = normalizePayload(action.actionType, action.payload);
    const webhookUrl = payload.data.url || '';
    this.logger.log(
      `[CallWebhookActionHandler] Triggering webhook callback to: ${webhookUrl}`,
    );

    await this.executionRepo.createLog({
      executionId: context.executionId,
      level: 'INFO',
      message: `Triggered webhook callback URL: "${webhookUrl}"`,
      metadata: { actionId: action.id, webhookUrl },
    });
  }
}
