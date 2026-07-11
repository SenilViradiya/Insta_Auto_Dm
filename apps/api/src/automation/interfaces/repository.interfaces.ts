export interface AutomationExecutionModel {
  id: string;
  automationId: string;
  eventId: string;
  status: string;
  startedAt: Date;
  completedAt?: Date | null;
  durationMs?: number | null;
}

export interface AutomationLogModel {
  id: string;
  executionId: string;
  level: string;
  message: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface AutomationActionModel {
  id: string;
  actionType: string;
  payload: Record<string, any>;
}

export interface AutomationConditionModel {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface AutomationModel {
  id: string;
  workspaceId?: string | null;
  instagramAccountId: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  triggerType: string | null;
  triggerConfig: any;
  conditions: AutomationConditionModel[];
  actions: AutomationActionModel[];
  createdAt: Date;
  updatedAt: Date;
}
