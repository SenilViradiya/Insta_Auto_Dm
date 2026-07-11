import { TriggerType } from '@prisma/client';
import { DomainEvent } from './domain-event.interface';
import { AutomationModel } from './repository.interfaces';

export interface TriggerContext {
  automation: AutomationModel;
  event: DomainEvent;
  instagramAccount?: any;
  workspaceId?: string | null;
  currentTime: Date;
  metadata?: Record<string, any>;
}

export interface TriggerMatchResult {
  matched: boolean;
  reason?: string;
  matchedConditions?: any[];
  normalizedEvent?: any;
}

export interface TriggerStrategy {
  triggerType(): TriggerType;
  validateConfiguration(config: any): void;
  normalizeConfiguration(config: any): any;
  matchesEvent(context: TriggerContext): TriggerMatchResult;
  explainConfiguration(config: any): string;
}
