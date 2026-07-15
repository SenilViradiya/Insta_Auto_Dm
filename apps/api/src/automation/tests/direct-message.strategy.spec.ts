import { DirectMessageTriggerStrategy } from '../strategies/direct-message.strategy';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { TriggerType } from '@prisma/client';
import { TriggerValidationException } from '../errors/automation.errors';

describe('DirectMessageTriggerStrategy', () => {
  let strategy: DirectMessageTriggerStrategy;

  beforeEach(() => {
    strategy = new DirectMessageTriggerStrategy();
  });

  const baseEvent: DomainEvent = {
    eventId: 'evt-1',
    instagramAccountId: 'default',
    platform: 'instagram',
    eventType: TriggerType.DIRECT_MESSAGE,
    senderId: 'user-1',
    recipientId: 'page-1',
    content: {},
    timestamp: new Date(),
  };

  const baseAutomation: AutomationModel = {
    id: 'auto-1',
    instagramAccountId: 'default',
    name: 'Test DM',
    enabled: true,
    triggerType: TriggerType.DIRECT_MESSAGE,
    triggerConfig: {},
    conditions: [],
    actions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should return correct trigger type', () => {
    expect(strategy.triggerType()).toBe(TriggerType.DIRECT_MESSAGE);
  });

  describe('Validation', () => {
    it('accepts valid ANY_MESSAGE configuration', () => {
      expect(() =>
        strategy.validateConfiguration({ mode: 'ANY_MESSAGE' }),
      ).not.toThrow();
    });

    it('accepts valid KEYWORD configuration', () => {
      expect(() =>
        strategy.validateConfiguration({ mode: 'KEYWORD', keywords: ['test'] }),
      ).not.toThrow();
    });

    it('rejects invalid mode', () => {
      expect(() => strategy.validateConfiguration({ mode: 'INVALID' })).toThrow(
        TriggerValidationException,
      );
    });

    it('rejects empty keywords array for KEYWORD mode', () => {
      expect(() =>
        strategy.validateConfiguration({ mode: 'KEYWORD', keywords: [] }),
      ).toThrow(TriggerValidationException);
    });

    it('rejects missing configuration', () => {
      expect(() => strategy.validateConfiguration(null)).toThrow(
        TriggerValidationException,
      );
      expect(() => strategy.validateConfiguration(undefined)).toThrow(
        TriggerValidationException,
      );
    });
  });

  describe('Normalization', () => {
    it('normalizes configurations correctly', () => {
      const config = { mode: 'KEYWORD', keywords: ['hello '] };
      expect(strategy.normalizeConfiguration(config)).toEqual({
        mode: 'KEYWORD',
        keywords: ['hello '],
      });
    });
  });

  describe('Explanation', () => {
    it('generates correct explanations', () => {
      expect(strategy.explainConfiguration({ mode: 'ANY_MESSAGE' })).toBe(
        'Triggers on any incoming direct message.',
      );
      expect(
        strategy.explainConfiguration({
          mode: 'KEYWORD',
          keywords: ['a', 'b'],
        }),
      ).toBe('Triggers when direct message contains keyword(s): a, b.');
    });
  });

  describe('Event Matching', () => {
    it('matches ANY_MESSAGE regardless of payload text', () => {
      const automation = {
        ...baseAutomation,
        triggerConfig: { mode: 'ANY_MESSAGE' },
      };
      const event = {
        ...baseEvent,
        content: { text: 'Some random message text' },
      };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
    });

    it('matches exact case-insensitive keyword', () => {
      const automation = {
        ...baseAutomation,
        triggerConfig: { mode: 'KEYWORD', keywords: ['hello'] },
      };
      const event = { ...baseEvent, content: { text: 'Hello, world!' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
      expect(result.matchedConditions).toEqual(['hello']);
    });

    it('does not match when keyword is missing from text', () => {
      const automation = {
        ...baseAutomation,
        triggerConfig: { mode: 'KEYWORD', keywords: ['goodbye'] },
      };
      const event = { ...baseEvent, content: { text: 'Hello, world!' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(false);
    });

    it('handles null description and missing content.text gracefully', () => {
      const automation = {
        ...baseAutomation,
        triggerConfig: { mode: 'KEYWORD', keywords: ['goodbye'] },
      };
      const event = { ...baseEvent, content: {} };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(false);
    });
  });
});
