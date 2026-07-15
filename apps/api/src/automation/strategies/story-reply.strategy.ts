import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import {
  TriggerStrategy,
  TriggerContext,
  TriggerMatchResult,
} from '../interfaces/trigger.interface';
import { TriggerValidationException } from '../errors/automation.errors';
import { StoryReplyTriggerSchema } from '../dto/trigger-validators';

@Injectable()
export class StoryReplyTriggerStrategy implements TriggerStrategy {
  triggerType(): TriggerType {
    return TriggerType.STORY_REPLY;
  }

  validateConfiguration(config: any): void {
    const res = StoryReplyTriggerSchema.safeParse(config);
    if (!res.success) {
      throw new TriggerValidationException(res.error.message);
    }
  }

  normalizeConfiguration(config: any): any {
    this.validateConfiguration(config);
    return StoryReplyTriggerSchema.parse(config);
  }

  matchesEvent(context: TriggerContext): TriggerMatchResult {
    const config = context.automation.triggerConfig;
    this.validateConfiguration(config);

    return { matched: true, reason: 'Matches any story reply.' };
  }

  explainConfiguration(config: any): string {
    this.validateConfiguration(config);
    return 'Triggers on any story reply event.';
  }
}
