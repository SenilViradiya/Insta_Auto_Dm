import { ConditionEngine } from '../services/condition-engine';
import { VariableResolver } from '../services/variable-resolver';
import { ExecutionEngine } from '../services/execution-engine';
import { ActionStrategyResolver } from '../services/action-strategy.resolver';
import { WaitActionStrategy } from '../strategies/wait-action.strategy';
import { SendMessageActionStrategy } from '../strategies/send-message-action.strategy';
import { ReplyCommentActionStrategy } from '../strategies/reply-comment-action.strategy';
import {
  Operator,
  TriggerType,
  ActionType,
  ExecutionStatus,
} from '@prisma/client';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { ExecutionContext } from '../interfaces/execution-context.interface';
import {
  ConditionException,
  VariableResolutionException,
  ActionException,
} from '../errors/automation.errors';

describe('ConditionEngine (AND / OR Groups)', () => {
  const conditionEngine = new ConditionEngine();

  const mockContext = {
    content: {
      text: 'Hello target message',
    },
  };

  it('should support AND logic group matched evaluation', () => {
    const group = {
      conjunction: 'AND' as const,
      conditions: [
        { field: 'content.text', operator: Operator.CONTAINS, value: 'target' },
        {
          field: 'content.text',
          operator: Operator.STARTS_WITH,
          value: 'Hello',
        },
      ],
      groups: [],
    };

    const result = conditionEngine.evaluateGroup(group, mockContext);
    expect(result.matched).toBe(true);
  });

  it('should support OR logic group matched evaluation', () => {
    const group = {
      conjunction: 'OR' as const,
      conditions: [
        { field: 'content.text', operator: Operator.CONTAINS, value: 'apples' },
        {
          field: 'content.text',
          operator: Operator.CONTAINS,
          value: 'message',
        },
      ],
      groups: [],
    };

    const result = conditionEngine.evaluateGroup(group, mockContext);
    expect(result.matched).toBe(true);
  });

  it('should fail OR group evaluation when all conditions fail', () => {
    const group = {
      conjunction: 'OR' as const,
      conditions: [
        { field: 'content.text', operator: Operator.CONTAINS, value: 'apples' },
        { field: 'content.text', operator: Operator.EQUALS, value: 'Hello' },
      ],
      groups: [],
    };

    const result = conditionEngine.evaluateGroup(group, mockContext);
    expect(result.matched).toBe(false);
  });

  it('should raise ConditionException on unknown operator', () => {
    const group = {
      conjunction: 'AND' as const,
      conditions: [
        { field: 'content.text', operator: 'UNKNOWN_OP', value: 'value' },
      ],
    };

    expect(() =>
      conditionEngine.evaluateGroup(group as any, mockContext),
    ).toThrow(ConditionException);
  });
});

describe('VariableResolver resolution mechanics', () => {
  const variableResolver = new VariableResolver();

  const mockContext: ExecutionContext = {
    executionId: 'exe-1',
    instagramAccountId: 'page-1',
    automationId: 'auto-1',
    triggerType: TriggerType.DIRECT_MESSAGE,
    triggerPayload: {
      content: {
        text: 'hello context comment',
        caption: 'beautiful reel caption',
      },
    },
    sender: {
      id: 'sender-1',
      username: 'johndoe',
    },
    recipient: {
      id: 'recipient-1',
    },
    variables: {},
    metadata: {},
    timestamp: new Date(),
  };

  it('should resolve standard system variables correctly', () => {
    expect(
      variableResolver.resolve('Hello {{user.username}}!', mockContext),
    ).toBe('Hello johndoe!');
    expect(
      variableResolver.resolve('Reply: {{comment.text}}', mockContext),
    ).toBe('Reply: hello context comment');
    expect(
      variableResolver.resolve('Caption: {{reel.caption}}', mockContext),
    ).toBe('Caption: beautiful reel caption');
  });

  it('should resolve custom nested paths in execution context', () => {
    expect(
      variableResolver.resolve('Context ID: {{executionId}}', mockContext),
    ).toBe('Context ID: exe-1');
  });

  it('should throw VariableResolutionException on missing/unsupported variable template', () => {
    expect(() =>
      variableResolver.resolve(
        'Hello {{invalid.nested.path.expression}}',
        mockContext,
      ),
    ).toThrow(VariableResolutionException);
  });
});

describe('Action Strategies execution', () => {
  let resolver: ActionStrategyResolver;
  let waitStrategy: WaitActionStrategy;
  let sendStrategy: SendMessageActionStrategy;
  let replyStrategy: ReplyCommentActionStrategy;
  let mockMessagingService: any;

  beforeEach(() => {
    waitStrategy = new WaitActionStrategy();
    mockMessagingService = {
      send: jest.fn().mockResolvedValue({ success: true }),
      sendPublicReply: jest.fn().mockResolvedValue({ success: true }),
    };
    const varResolver = new VariableResolver();
    sendStrategy = new SendMessageActionStrategy(
      varResolver,
      mockMessagingService,
    );
    replyStrategy = new ReplyCommentActionStrategy(
      varResolver,
      mockMessagingService,
    );
    resolver = new ActionStrategyResolver(
      sendStrategy,
      waitStrategy,
      replyStrategy,
    );
  });

  const mockContext: ExecutionContext = {
    executionId: 'exe-123',
    instagramAccountId: 'account-123',
    automationId: 'auto-123',
    triggerType: TriggerType.DIRECT_MESSAGE,
    triggerPayload: {},
    sender: { id: 'sender-123', username: 'alex' },
    recipient: { id: 'recipient-123' },
    variables: {},
    metadata: {},
    timestamp: new Date(),
  };

  it('should route WAIT action type through WaitActionStrategy', async () => {
    const action = {
      id: 'act-wait',
      actionType: 'WAIT',
      payload: { data: { delaySeconds: 15 } },
    };

    const strategy = resolver.resolve('WAIT');
    const result = await strategy.execute(action, mockContext);

    expect(result.transitionToStatus).toBe('WAITING');
    expect(result.retryable).toBe(false);
  });

  it('should dispatch messages in SendMessageActionStrategy resolving templates', async () => {
    const action = {
      id: 'act-send',
      actionType: 'SEND_MESSAGE',
      payload: { data: { text: 'Hi {{user.username}}!' } },
    };

    const strategy = resolver.resolve('SEND_MESSAGE');
    const result = await strategy.execute(action, mockContext);

    expect(result.transitionToStatus).toBe('SUCCESS');
    expect(mockMessagingService.send).toHaveBeenCalledWith({
      instagramAccountId: 'account-123',
      recipientInstagramId: 'sender-123',
      messageText: 'Hi alex!',
      messageType: 'TEXT',
      automationExecutionId: 'exe-123',
    });
  });

  it('should check if strategies raise ActionException on malformed wait delaySeconds config', async () => {
    const action = {
      id: 'act-wait',
      actionType: 'WAIT',
      payload: { data: { delaySeconds: -5 } },
    };

    const strategy = resolver.resolve('WAIT');
    await expect(strategy.execute(action, mockContext)).rejects.toThrow(
      ActionException,
    );
  });
});
