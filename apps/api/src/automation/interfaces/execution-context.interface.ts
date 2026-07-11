import { TriggerType } from '@prisma/client';

export interface ExecutionContext {
  executionId: string;
  workspaceId?: string;
  instagramAccountId: string;
  automationId: string;
  triggerType: TriggerType;
  triggerPayload: any;
  sender: {
    id: string;
    username?: string;
  };
  recipient: {
    id: string;
  };
  variables: Record<string, string>;
  metadata: Record<string, any>;
  timestamp: Date;
}
