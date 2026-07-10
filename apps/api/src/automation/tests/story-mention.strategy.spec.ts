import { StoryMentionTriggerStrategy } from '../strategies/story-mention.strategy';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { TriggerType } from '@prisma/client';
import { TriggerValidationException } from '../errors/automation.errors';

describe('StoryMentionTriggerStrategy', () => {
  let strategy: StoryMentionTriggerStrategy;

  beforeEach(() => {
    strategy = new StoryMentionTriggerStrategy();
  });

  const baseEvent: DomainEvent = {
    eventId: 'evt-1',
    instagramAccountId: 'default',
    platform: 'instagram',
    eventType: TriggerType.STORY_MENTION,
    senderId: 'user-1',
    recipientId: 'page-1',
    content: {},
    timestamp: new Date(),
  };

  const baseAutomation: AutomationModel = {
    id: 'auto-1',
    instagramAccountId: 'default',
    name: 'Test Story Mention',
    enabled: true,
    triggerType: TriggerType.STORY_MENTION,
    triggerConfig: {},
    conditions: [],
    actions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should return correct trigger type', () => {
    expect(strategy.triggerType()).toBe(TriggerType.STORY_MENTION);
  });

  describe('Validation', () => {
    it('accepts empty configuration', () => {
      expect(() => strategy.validateConfiguration({})).not.toThrow();
      expect(() => strategy.validateConfiguration(null)).not.toThrow();
      expect(() => strategy.validateConfiguration(undefined)).not.toThrow();
    });
  });

  describe('Event Matching', () => {
    it('matches always', () => {
      const context = { automation: baseAutomation, event: baseEvent, currentTime: new Date() };
      const result = strategy.matchesEvent(context);
      expect(result.matched).toBe(true);
    });
  });
});
