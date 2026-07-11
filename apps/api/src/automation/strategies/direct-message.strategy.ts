import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { TriggerStrategy, TriggerContext, TriggerMatchResult } from '../interfaces/trigger.interface';
import { TriggerValidationException } from '../errors/automation.errors';
import { DirectMessageTriggerSchema } from '../dto/trigger-validators';

@Injectable()
export class DirectMessageTriggerStrategy implements TriggerStrategy {
  triggerType(): TriggerType {
    return TriggerType.DIRECT_MESSAGE;
  }

  validateConfiguration(config: any): void {
    const res = DirectMessageTriggerSchema.safeParse(config);
    if (!res.success) {
      throw new TriggerValidationException(res.error.message);
    }
  }

  normalizeConfiguration(config: any): any {
    this.validateConfiguration(config);
    return DirectMessageTriggerSchema.parse(config);
  }

  matchesEvent(context: TriggerContext): TriggerMatchResult {
    const config = context.automation.triggerConfig;
    this.validateConfiguration(config);

    if (config.mode === 'ANY_MESSAGE') {
      return { matched: true, reason: 'Matches any direct message.' };
    }

    if (config.mode === 'KEYWORD') {
      const text = (context.event.content?.text || '').toLowerCase().trim();
      const keywords: string[] = config.keywords || [];
      const matchedKeywords = keywords.filter(k => text.includes(k.toLowerCase().trim()));
      
      if (matchedKeywords.length > 0) {
        return { 
          matched: true, 
          reason: `Matched keyword(s): ${matchedKeywords.join(', ')}`,
          matchedConditions: matchedKeywords 
        };
      }
      return { matched: false, reason: `Direct message text "${text}" did not match keywords.` };
    }

    return { matched: false, reason: 'Unknown mode.' };
  }

  explainConfiguration(config: any): string {
    this.validateConfiguration(config);
    if (config.mode === 'ANY_MESSAGE') {
      return 'Triggers on any incoming direct message.';
    }
    if (config.mode === 'KEYWORD') {
      return `Triggers when direct message contains keyword(s): ${(config.keywords || []).join(', ')}.`;
    }
    return 'Unknown DM configuration.';
  }
}
