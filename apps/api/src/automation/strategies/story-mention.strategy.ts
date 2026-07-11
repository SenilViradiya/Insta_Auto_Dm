import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { TriggerStrategy, TriggerContext, TriggerMatchResult } from '../interfaces/trigger.interface';
import { TriggerValidationException } from '../errors/automation.errors';
import { StoryMentionTriggerSchema } from '../dto/trigger-validators';

@Injectable()
export class StoryMentionTriggerStrategy implements TriggerStrategy {
  triggerType(): TriggerType {
    return TriggerType.STORY_MENTION;
  }

  validateConfiguration(config: any): void {
    const res = StoryMentionTriggerSchema.safeParse(config || {});
    if (!res.success) {
      throw new TriggerValidationException(res.error.message);
    }
  }

  normalizeConfiguration(config: any): any {
    this.validateConfiguration(config);
    return StoryMentionTriggerSchema.parse(config || {});
  }

  matchesEvent(context: TriggerContext): TriggerMatchResult {
    const config = context.automation.triggerConfig;
    this.validateConfiguration(config);

    return { matched: true, reason: 'Matches any story mention.' };
  }

  explainConfiguration(config: any): string {
    this.validateConfiguration(config);
    return 'Triggers on any story mention event.';
  }
}
