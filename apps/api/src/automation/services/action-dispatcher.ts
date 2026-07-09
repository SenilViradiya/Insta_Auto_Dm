import { Injectable, Logger } from '@nestjs/common';
import { ActionType, AutomationAction } from '@prisma/client';
import { DomainEvent } from '../interfaces/domain-event.interface';
import {
  AutomationActionHandler,
  SendMessageActionHandler,
  WaitActionHandler,
  AddTagActionHandler,
  CallWebhookActionHandler,
} from './action-handlers';

@Injectable()
export class ActionDispatcher {
  private readonly logger = new Logger(ActionDispatcher.name);
  private readonly handlers: Record<ActionType, AutomationActionHandler>;

  constructor(
    sendMessageHandler: SendMessageActionHandler,
    waitHandler: WaitActionHandler,
    addTagHandler: AddTagActionHandler,
    callWebhookHandler: CallWebhookActionHandler,
  ) {
    this.handlers = {
      [ActionType.SEND_MESSAGE]: sendMessageHandler,
      [ActionType.WAIT]: waitHandler,
      [ActionType.ADD_TAG]: addTagHandler,
      [ActionType.CALL_WEBHOOK]: callWebhookHandler,
    };
  }

  async dispatch(
    action: AutomationAction,
    event: DomainEvent,
    context: { executionId: string },
  ): Promise<void> {
    const handler = this.handlers[action.actionType];
    if (!handler) {
      this.logger.error(
        `Handler for action type ${action.actionType} is not registered`,
      );
      throw new Error(`Handler for action type ${action.actionType} not found`);
    }

    this.logger.debug(
      `Dispatching action ${action.id} (Type: ${action.actionType})`,
    );
    await handler.execute(action, event, context);
  }
}
