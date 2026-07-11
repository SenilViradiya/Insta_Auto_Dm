import { ExecutionContext } from './execution-context.interface';

export interface ActionStrategyResult {
  transitionToStatus?: 'WAITING' | 'SUCCESS';
  // Tells execution worker if the failure is transient / retryable or permanent
  retryable?: boolean;
}

export interface ActionStrategy {
  readonly actionType: string;
  execute(
    action: { id: string; actionType: string; payload: any },
    context: ExecutionContext,
  ): Promise<ActionStrategyResult>;
}
