import { TriggerRegistry } from '../services/trigger.registry';
import { TriggerResolver } from '../services/trigger.resolver';
import { DirectMessageTriggerStrategy } from '../strategies/direct-message.strategy';
import { ReelCommentTriggerStrategy } from '../strategies/reel-comment.strategy';
import { PostCommentTriggerStrategy } from '../strategies/post-comment.strategy';
import { StoryReplyTriggerStrategy } from '../strategies/story-reply.strategy';
import { StoryMentionTriggerStrategy } from '../strategies/story-mention.strategy';
import { TriggerType } from '@prisma/client';
import { UnknownTriggerException } from '../errors/automation.errors';

describe('Trigger Registry and Resolver Framework', () => {
  let registry: TriggerRegistry;
  let resolver: TriggerResolver;

  beforeEach(() => {
    const dm = new DirectMessageTriggerStrategy();
    const reel = new ReelCommentTriggerStrategy();
    const post = new PostCommentTriggerStrategy();
    const storyReply = new StoryReplyTriggerStrategy();
    const storyMention = new StoryMentionTriggerStrategy();

    registry = new TriggerRegistry(dm, reel, post, storyReply, storyMention);
    resolver = new TriggerResolver(registry);
  });

  describe('TriggerRegistry', () => {
    it('contains all strategies in registry map', () => {
      const all = registry.getAll();
      expect(all.length).toBe(5);
    });
  });

  describe('TriggerResolver', () => {
    it('resolves strategies in O(1)', () => {
      const dmStrategy = resolver.resolve(TriggerType.DIRECT_MESSAGE);
      expect(dmStrategy).toBeInstanceOf(DirectMessageTriggerStrategy);

      const reelStrategy = resolver.resolve(TriggerType.REEL_COMMENT);
      expect(reelStrategy).toBeInstanceOf(ReelCommentTriggerStrategy);
    });

    it('throws UnknownTriggerException for unregistered types', () => {
      expect(() => resolver.resolve('UNREGISTERED' as any)).toThrow(
        UnknownTriggerException,
      );
    });
  });
});
