import { PostCommentTriggerStrategy } from '../strategies/post-comment.strategy';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { TriggerType } from '@prisma/client';
import { TriggerValidationException } from '../errors/automation.errors';

describe('PostCommentTriggerStrategy', () => {
  let strategy: PostCommentTriggerStrategy;

  beforeEach(() => {
    strategy = new PostCommentTriggerStrategy();
  });

  const baseEvent: DomainEvent = {
    eventId: 'evt-1',
    instagramAccountId: 'default',
    platform: 'instagram',
    eventType: TriggerType.POST_COMMENT,
    senderId: 'user-1',
    recipientId: 'page-1',
    content: {},
    timestamp: new Date(),
  };

  const baseAutomation: AutomationModel = {
    id: 'auto-1',
    instagramAccountId: 'default',
    name: 'Test Post Comment',
    enabled: true,
    triggerType: TriggerType.POST_COMMENT,
    triggerConfig: {},
    conditions: [],
    actions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should return correct trigger type', () => {
    expect(strategy.triggerType()).toBe(TriggerType.POST_COMMENT);
  });

  describe('Validation', () => {
    it('accepts valid ALL_POSTS configuration', () => {
      expect(() =>
        strategy.validateConfiguration({ mediaScope: 'ALL_POSTS' }),
      ).not.toThrow();
    });

    it('accepts valid SPECIFIC_POST configuration', () => {
      expect(() =>
        strategy.validateConfiguration({
          mediaScope: 'SPECIFIC_POST',
          mediaId: '123',
        }),
      ).not.toThrow();
    });

    it('rejects SPECIFIC_POST with missing mediaId', () => {
      expect(() =>
        strategy.validateConfiguration({ mediaScope: 'SPECIFIC_POST' }),
      ).toThrow(TriggerValidationException);
    });

    it('rejects KEYWORD matchType with empty or absent keywords', () => {
      expect(() =>
        strategy.validateConfiguration({
          mediaScope: 'ALL_POSTS',
          matchType: 'KEYWORD',
        }),
      ).toThrow(TriggerValidationException);
      expect(() =>
        strategy.validateConfiguration({
          mediaScope: 'ALL_POSTS',
          matchType: 'KEYWORD',
          keywords: [],
        }),
      ).toThrow(TriggerValidationException);
    });

    it('rejects missing configuration', () => {
      expect(() => strategy.validateConfiguration(null)).toThrow(
        TriggerValidationException,
      );
    });
  });

  describe('Event Matching', () => {
    it('matches ALL_POSTS and ANY_COMMENT comment trigger configs', () => {
      const automation = {
        ...baseAutomation,
        triggerConfig: { mediaScope: 'ALL_POSTS', matchType: 'ANY_COMMENT' },
      };
      const event = { ...baseEvent, content: { text: 'Some comment text' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
    });

    it('matches SPECIFIC_POST when mediaId matches exactly', () => {
      const automation = {
        ...baseAutomation,
        triggerConfig: { mediaScope: 'SPECIFIC_POST', mediaId: '123' },
      };
      const event = { ...baseEvent, content: { media_id: '123' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
    });

    it('does not match SPECIFIC_POST if mediaId differs', () => {
      const automation = {
        ...baseAutomation,
        triggerConfig: { mediaScope: 'SPECIFIC_POST', mediaId: '123' },
      };
      const event = { ...baseEvent, content: { mediaId: '999' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(false);
    });

    it('matches keyword trigger config case-insensitively', () => {
      const automation = {
        ...baseAutomation,
        triggerConfig: {
          mediaScope: 'ALL_POSTS',
          matchType: 'KEYWORD',
          keywords: ['promo'],
        },
      };
      const event = {
        ...baseEvent,
        content: { text: 'Interested in promo details' },
      };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
      expect(result.matchedConditions).toEqual(['promo']);
    });
  });
});
