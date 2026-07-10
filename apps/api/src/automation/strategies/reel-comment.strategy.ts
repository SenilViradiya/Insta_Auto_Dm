import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { TriggerStrategy, TriggerContext, TriggerMatchResult } from '../interfaces/trigger.interface';
import { TriggerValidationException } from '../errors/automation.errors';
import { ReelCommentTriggerSchema } from '../dto/trigger-validators';

@Injectable()
export class ReelCommentTriggerStrategy implements TriggerStrategy {
  triggerType(): TriggerType {
    return TriggerType.REEL_COMMENT;
  }

  validateConfiguration(config: any): void {
    const res = ReelCommentTriggerSchema.safeParse(config);
    if (!res.success) {
      throw new TriggerValidationException(res.error.message);
    }
  }

  normalizeConfiguration(config: any): any {
    this.validateConfiguration(config);
    return ReelCommentTriggerSchema.parse(config);
  }

  matchesEvent(context: TriggerContext): TriggerMatchResult {
    const config = context.automation.triggerConfig;
    this.validateConfiguration(config);

    // Check media id if mediaScope is SPECIFIC_REEL
    if (config.mediaScope === 'SPECIFIC_REEL') {
      const eventMediaId = context.event.content?.mediaId || context.event.content?.media_id;
      if (!eventMediaId || eventMediaId !== config.mediaId) {
        return { matched: false, reason: `Event media ID "${eventMediaId}" does not match specific reel ID "${config.mediaId}".` };
      }
    }

    // Check matchType (ANY_COMMENT or KEYWORD)
    if (config.matchType === 'KEYWORD') {
      const text = (context.event.content?.text || '').toLowerCase().trim();
      const keywords: string[] = config.keywords || [];
      const matchedKeywords = keywords.filter(k => text.includes(k.toLowerCase().trim()));
      
      if (matchedKeywords.length === 0) {
        return { matched: false, reason: `Comment text "${text}" did not match keywords.` };
      }
      return { 
        matched: true, 
        reason: `Matched keyword(s): ${matchedKeywords.join(', ')}`,
        matchedConditions: matchedKeywords
      };
    }

    return { matched: true, reason: 'Matches comment criteria.' };
  }

  explainConfiguration(config: any): string {
    this.validateConfiguration(config);
    const scopeText = config.mediaScope === 'ALL_REELS' 
      ? 'all reels' 
      : `specific reel (${config.mediaId})`;
    const matchText = config.matchType === 'KEYWORD' 
      ? `containing keywords: ${(config.keywords || []).join(', ')}` 
      : 'any comment';
    return `Triggers on comments matching ${matchText} on ${scopeText}.`;
  }
}
