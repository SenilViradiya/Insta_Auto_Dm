import { ConditionService } from '../services/condition.service';
import { ActionDispatcher } from '../services/action-dispatcher';
import { Operator, TriggerType, ActionType } from '@prisma/client';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { normalizePayload } from '../dto/action-payload.validator';

describe('Condition Engine', () => {
  const conditionService = new ConditionService();

  const mockEvent: DomainEvent = {
    eventId: 'evt-1',
    instagramAccountId: 'default',
    platform: 'instagram',
    eventType: TriggerType.DIRECT_MESSAGE,
    senderId: 'user-1',
    recipientId: 'page-1',
    content: { text: 'Hello, World!' },
    timestamp: new Date(),
  };

  it('should evaluate EQUALS operator correctly and support backward compatible message.* target key mapping', () => {
    const conditions: any[] = [
      {
        field: 'message.text',
        operator: Operator.EQUALS,
        value: 'Hello, World!',
      },
    ];
    expect(conditionService.evaluateConditions(conditions, mockEvent)).toBe(
      true,
    );

    const failingConditions: any[] = [
      { field: 'message.text', operator: Operator.EQUALS, value: 'other' },
    ];
    expect(
      conditionService.evaluateConditions(failingConditions, mockEvent),
    ).toBe(false);
  });

  it('should evaluate NOT_EQUALS operator correctly', () => {
    const conditions: any[] = [
      { field: 'content.text', operator: Operator.NOT_EQUALS, value: 'other' },
    ];
    expect(conditionService.evaluateConditions(conditions, mockEvent)).toBe(
      true,
    );
  });

  it('should evaluate CONTAINS operator correctly', () => {
    const conditions: any[] = [
      { field: 'content.text', operator: Operator.CONTAINS, value: 'World' },
    ];
    expect(conditionService.evaluateConditions(conditions, mockEvent)).toBe(
      true,
    );

    const failing: any[] = [
      { field: 'content.text', operator: Operator.CONTAINS, value: 'Apples' },
    ];
    expect(conditionService.evaluateConditions(failing, mockEvent)).toBe(false);
  });

  it('should evaluate NOT_CONTAINS operator correctly', () => {
    const conditions: any[] = [
      {
        field: 'content.text',
        operator: Operator.NOT_CONTAINS,
        value: 'Apples',
      },
    ];
    expect(conditionService.evaluateConditions(conditions, mockEvent)).toBe(
      true,
    );
  });

  it('should evaluate STARTS_WITH operator correctly', () => {
    const conditions: any[] = [
      { field: 'content.text', operator: Operator.STARTS_WITH, value: 'Hello' },
    ];
    expect(conditionService.evaluateConditions(conditions, mockEvent)).toBe(
      true,
    );
  });

  it('should evaluate ENDS_WITH operator correctly', () => {
    const conditions: any[] = [
      { field: 'content.text', operator: Operator.ENDS_WITH, value: 'World!' },
    ];
    expect(conditionService.evaluateConditions(conditions, mockEvent)).toBe(
      true,
    );
  });

  it('should evaluate REGEX operator correctly', () => {
    const conditions: any[] = [
      { field: 'content.text', operator: Operator.REGEX, value: '^Hello.*!$' },
    ];
    expect(conditionService.evaluateConditions(conditions, mockEvent)).toBe(
      true,
    );
  });
});

describe('Action Dispatcher & Handlers', () => {
  let dispatcher: ActionDispatcher;
  let mockSendMessage: any;
  let mockWait: any;
  let mockAddTag: any;
  let mockCallWebhook: any;
  let mockReplyComment: any;
  beforeEach(() => {
    mockSendMessage = { execute: jest.fn() };
    mockWait = { execute: jest.fn() };
    mockAddTag = { execute: jest.fn() };
    mockCallWebhook = { execute: jest.fn() };
    mockReplyComment = { execute: jest.fn() };

    dispatcher = new ActionDispatcher(
      mockSendMessage,
      mockWait,
      mockAddTag,
      mockCallWebhook,
      mockReplyComment,
    );
  });

  it('should routes actions to corresponding strategy handlers', async () => {
    const mockEvent: DomainEvent = {
      eventId: 'evt-1',
      instagramAccountId: 'default',
      platform: 'instagram',
      eventType: TriggerType.DIRECT_MESSAGE,
      senderId: 'user-1',
      recipientId: 'page-1',
      content: { text: '' },
      timestamp: new Date(),
    };

    const action: any = {
      id: 'act-1',
      actionType: ActionType.SEND_MESSAGE,
      payload: { message: 'hi' },
    };

    await dispatcher.dispatch(action, mockEvent, { executionId: 'exe-1' });
    expect(mockSendMessage.execute).toHaveBeenCalledWith(action, mockEvent, {
      executionId: 'exe-1',
    });
  });
});

describe('Action Payload Versioning & Normalization', () => {
  it('should normalize legacy actions payload structures', () => {
    const legacyPayload = { message: 'Hello' };
    const normalized = normalizePayload(ActionType.SEND_MESSAGE, legacyPayload);

    expect(normalized).toEqual({
      version: 1,
      type: ActionType.SEND_MESSAGE,
      data: { message: 'Hello' },
    });
  });

  it('should validate structured versioned payloads correctly', () => {
    const versionedPayload = {
      version: 1,
      type: ActionType.SEND_MESSAGE,
      data: { text: 'Hello' },
    };
    const normalized = normalizePayload(
      ActionType.SEND_MESSAGE,
      versionedPayload,
    );

    expect(normalized.version).toBe(1);
    expect(normalized.data.text).toBe('Hello');
  });

  it('should throw validation error on malformed versioned payload', () => {
    const malformedPayload = {
      version: 0, // Invalid version
      type: 'INVALID_TYPE',
      data: 'string-instead-of-object',
    };

    expect(() =>
      normalizePayload(ActionType.SEND_MESSAGE, malformedPayload),
    ).toThrow();
  });
});
