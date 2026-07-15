export type TriggerType =
  | "DIRECT_MESSAGE"
  | "REEL_COMMENT"
  | "POST_COMMENT"
  | "STORY_REPLY"
  | "STORY_MENTION";

export interface Condition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "STARTS_WITH"
    | "ENDS_WITH"
    | "REGEX";
  value: string;
}

export type ActionType = "SEND_MESSAGE" | "WAIT" | "REPLY_COMMENT";

export interface ActionItem {
  id?: string;
  actionType: ActionType;
  payload: {
    version: number;
    type: string;
    data: {
      text?: string;
      delaySeconds?: number;
    };
  };
}

export interface AutomationDraft {
  metadata: {
    name: string;
    description?: string;
  };
  trigger: {
    type: TriggerType;
    config: any;
  };
  conditions: Condition[];
  actions: ActionItem[];
  review: {
    valid: boolean;
    warnings: string[];
  };
}
