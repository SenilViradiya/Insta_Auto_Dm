import { Injectable, Logger } from '@nestjs/common';
import {
  ActionStrategy,
  ActionStrategyResult,
} from '../interfaces/action-strategy.interface';
import { ExecutionContext } from '../interfaces/execution-context.interface';
import { ActionException } from '../errors/automation.errors';

@Injectable()
export class WaitActionStrategy implements ActionStrategy {
  readonly actionType = 'WAIT';
  private readonly logger = new Logger(WaitActionStrategy.name);

  async execute(
    action: { id: string; actionType: string; payload: any },
    context: ExecutionContext,
  ): Promise<ActionStrategyResult> {
    const payload = action.payload || {};
    const data = payload.data || payload || {};
    const delaySeconds =
      typeof data.delaySeconds === 'number' ? data.delaySeconds : 0;

    if (delaySeconds < 0) {
      throw new ActionException(`Invalid wait delaySeconds: ${delaySeconds}`);
    }

    this.logger.debug(
      `[WaitActionStrategy] Executing wait of ${delaySeconds}s (ExecutionId: ${context.executionId})`,
    );

    return {
      transitionToStatus: 'WAITING',
      retryable: false, // Wait timer operations do not retry
      delaySeconds,
    };
  }
}
