import { ReelCommentTriggerStrategy } from '../strategies/reel-comment.strategy';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { TriggerType } from '@prisma/client';
import { TriggerValidationException } from '../errors/automation.errors';

describe('ReelCommentTriggerStrategy', () => {
  let strategy: ReelCommentTriggerStrategy;

  beforeEach(() => {
    strategy = new ReelCommentTriggerStrategy();
  });

  const baseEvent: DomainEvent = {
    eventId: 'evt-1',
    instagramAccountId: 'default',
    platform: 'instagram',
    eventType: TriggerType.REEL_COMMENT,
    senderId: 'user-1',
    recipientId: 'page-1',
    content: {},
    timestamp: new Date(),
  };

  const baseAutomation: AutomationModel = {
    id: 'auto-1',
    instagramAccountId: 'default',
    name: 'Test Reel Comment',
    enabled: true,
    triggerType: TriggerType.REEL_COMMENT,
    triggerConfig: {},
    conditions: [],
    actions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should return correct trigger type', () => {
    expect(strategy.triggerType()).toBe(TriggerType.REEL_COMMENT);
  });

  describe('Validation', () => {
    it('accepts valid ALL_REELS configuration', () => {
      expect(() => strategy.validateConfiguration({ mediaScope: 'ALL_REELS' })).not.toThrow();
    });

    it('accepts valid SPECIFIC_REEL configuration', () => {
      expect(() => strategy.validateConfiguration({ mediaScope: 'SPECIFIC_REEL', mediaId: '123' })).not.toThrow();
    });

    it('rejects SPECIFIC_REEL with missing mediaId', () => {
      expect(() => strategy.validateConfiguration({ mediaScope: 'SPECIFIC_REEL' })).toThrow(TriggerValidationException);
    });

    it('rejects KEYWORD matchType with empty or absent keywords', () => {
      expect(() => strategy.validateConfiguration({ mediaScope: 'ALL_REELS', matchType: 'KEYWORD' })).toThrow(TriggerValidationException);
      expect(() => strategy.validateConfiguration({ mediaScope: 'ALL_REELS', matchType: 'KEYWORD', keywords: [] })).toThrow(TriggerValidationException);
    });

    it('rejects missing configuration', () => {
      expect(() => strategy.validateConfiguration(null)).toThrow(TriggerValidationException);
    });
  });

  describe('Event Matching', () => {
    it('matches ALL_REELS and ANY_COMMENT comment trigger configs', () => {
      const automation = { ...baseAutomation, triggerConfig: { mediaScope: 'ALL_REELS', matchType: 'ANY_COMMENT' } };
      const event = { ...baseEvent, content: { text: 'Some comment text' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
    });

    it('matches SPECIFIC_REEL when mediaId matches exactly', () => {
      const automation = { ...baseAutomation, triggerConfig: { mediaScope: 'SPECIFIC_REEL', mediaId: '123' } };
      const event = { ...baseEvent, content: { media_id: '123' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
    });

    it('does not match SPECIFIC_REEL if mediaId differs', () => {
      const automation = { ...baseAutomation, triggerConfig: { mediaScope: 'SPECIFIC_REEL', mediaId: '123' } };
      const event = { ...baseEvent, content: { mediaId: '999' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(false);
    });

    it('matches keyword trigger config case-insensitively', () => {
      const automation = { ...baseAutomation, triggerConfig: { mediaScope: 'ALL_REELS', matchType: 'KEYWORD', keywords: ['promo'] } };
      const event = { ...baseEvent, content: { text: 'Interested in promo details' } };
      const context = { automation, event, currentTime: new Date() };

      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
      expect(result.matchedConditions).toEqual(['promo']);
    });
  });
});
