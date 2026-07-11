import { StoryReplyTriggerStrategy } from '../strategies/story-reply.strategy';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { TriggerType } from '@prisma/client';
import { TriggerValidationException } from '../errors/automation.errors';

describe('StoryReplyTriggerStrategy', () => {
  let strategy: StoryReplyTriggerStrategy;

  beforeEach(() => {
    strategy = new StoryReplyTriggerStrategy();
  });

  const baseEvent: DomainEvent = {
    eventId: 'evt-1',
    instagramAccountId: 'default',
    platform: 'instagram',
    eventType: TriggerType.STORY_REPLY,
    senderId: 'user-1',
    recipientId: 'page-1',
    content: {},
    timestamp: new Date(),
  };

  const baseAutomation: AutomationModel = {
    id: 'auto-1',
    instagramAccountId: 'default',
    name: 'Test Story Reply',
    enabled: true,
    triggerType: TriggerType.STORY_REPLY,
    triggerConfig: { storyScope: 'ANY' },
    conditions: [],
    actions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should return correct trigger type', () => {
    expect(strategy.triggerType()).toBe(TriggerType.STORY_REPLY);
  });

  describe('Validation', () => {
    it('accepts valid configuration', () => {
      expect(() => strategy.validateConfiguration({ storyScope: 'ANY' })).not.toThrow();
    });

    it('rejects invalid storyScope', () => {
      expect(() => strategy.validateConfiguration({ storyScope: 'INVALID' })).toThrow(TriggerValidationException);
    });

    it('rejects missing configuration', () => {
      expect(() => strategy.validateConfiguration(null)).toThrow(TriggerValidationException);
    });
  });

  describe('Event Matching', () => {
    it('matches always for valid scope', () => {
      const context = { automation: baseAutomation, event: baseEvent, currentTime: new Date() };
      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
    });
  });
});
