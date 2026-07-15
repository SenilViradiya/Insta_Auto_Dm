import { Injectable, Logger } from '@nestjs/common';
import { ActionStrategy } from '../interfaces/action-strategy.interface';
import { SendMessageActionStrategy } from '../strategies/send-message-action.strategy';
import { WaitActionStrategy } from '../strategies/wait-action.strategy';
import { ReplyCommentActionStrategy } from '../strategies/reply-comment-action.strategy';
import { ActionException } from '../errors/automation.errors';

@Injectable()
export class ActionStrategyResolver {
  private readonly logger = new Logger(ActionStrategyResolver.name);
  private readonly strategies = new Map<string, ActionStrategy>();

  constructor(
    sendMessageStrategy: SendMessageActionStrategy,
    waitStrategy: WaitActionStrategy,
    replyCommentStrategy: ReplyCommentActionStrategy,
  ) {
    this.register(sendMessageStrategy);
    this.register(waitStrategy);
    this.register(replyCommentStrategy);
  }

  register(strategy: ActionStrategy) {
    this.strategies.set(strategy.actionType, strategy);
    this.logger.log(`Registered Action Strategy: [${strategy.actionType}]`);
  }

  resolve(actionType: string): ActionStrategy {
    const strategy = this.strategies.get(actionType);
    if (!strategy) {
      throw new ActionException(
        `Action type "${actionType}" is not supported or registered`,
      );
    }
    return strategy;
  }
}
