import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { TriggerStrategy } from '../interfaces/trigger.interface';
import { DirectMessageTriggerStrategy } from '../strategies/direct-message.strategy';
import { ReelCommentTriggerStrategy } from '../strategies/reel-comment.strategy';
import { PostCommentTriggerStrategy } from '../strategies/post-comment.strategy';
import { StoryReplyTriggerStrategy } from '../strategies/story-reply.strategy';
import { StoryMentionTriggerStrategy } from '../strategies/story-mention.strategy';

@Injectable()
export class TriggerRegistry {
  private readonly strategies = new Map<TriggerType, TriggerStrategy>();

  constructor(
    private readonly dmStrategy: DirectMessageTriggerStrategy,
    private readonly reelStrategy: ReelCommentTriggerStrategy,
    private readonly postStrategy: PostCommentTriggerStrategy,
    private readonly storyReplyStrategy: StoryReplyTriggerStrategy,
    private readonly storyMentionStrategy: StoryMentionTriggerStrategy,
  ) {
    this.register(this.dmStrategy);
    this.register(this.reelStrategy);
    this.register(this.postStrategy);
    this.register(this.storyReplyStrategy);
    this.register(this.storyMentionStrategy);
  }

  register(strategy: TriggerStrategy): void {
    this.strategies.set(strategy.triggerType(), strategy);
  }

  get(type: TriggerType): TriggerStrategy | undefined {
    return this.strategies.get(type);
  }

  getAll(): TriggerStrategy[] {
    return Array.from(this.strategies.values());
  }
}
