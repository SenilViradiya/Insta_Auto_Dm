interface Keyword {
  id?: string;
  keyword: string;
  matchType: "EXACT" | "CONTAINS" | "STARTS_WITH";
}

interface Action {
  id?: string;
  message: string;
  delaySeconds: number;
}

interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  keywords: Keyword[];
  actions: Action[];
}

export function mapBackendToFrontend(backendAuto: any): Automation {
  if (!backendAuto) return {} as Automation;

  // 1. Map conditions -> keywords
  const keywords: Keyword[] = (backendAuto.conditions || []).map((cond: any) => {
    let matchType: "EXACT" | "CONTAINS" | "STARTS_WITH" = "EXACT";
    if (cond.operator === "CONTAINS") matchType = "CONTAINS";
    if (cond.operator === "STARTS_WITH") matchType = "STARTS_WITH";

    return {
      id: cond.id,
      keyword: cond.value || "",
      matchType,
    };
  });

  // 2. Map actions (WAIT & SEND_MESSAGE) -> frontend actions structure
  const actions: Action[] = [];
  const backendActions = backendAuto.actions || [];
  
  let tempDelay = 0;
  for (let i = 0; i < backendActions.length; i++) {
    const act = backendActions[i];
    const payload = act.payload || {};
    const data = payload.data || payload;

    if (act.actionType === "WAIT") {
      tempDelay = typeof data.delaySeconds === 'number' ? data.delaySeconds : 0;
    } else if (act.actionType === "SEND_MESSAGE" || act.actionType === "SEND_DM" || act.actionType === "MESSAGE_RECEIVED") {
      const messageText = typeof data.text === 'string'
        ? data.text
        : typeof data.message === 'string'
          ? data.message
          : '';

      actions.push({
        id: act.id,
        message: messageText,
        delaySeconds: tempDelay,
      });
      tempDelay = 0; // reset
    }
  }

  // Fallback if there are backend actions but none got matched (e.g. only WAIT, or only non-SEND_MESSAGE)
  if (actions.length === 0 && backendActions.length > 0) {
    const act = backendActions[0];
    const payload = act.payload || {};
    const data = payload.data || payload;
    actions.push({
      id: act.id,
      message: typeof data.text === 'string' ? data.text : (typeof data.message === 'string' ? data.message : JSON.stringify(data)),
      delaySeconds: tempDelay,
    });
  }

  // Default empty action if somehow none exist
  if (actions.length === 0) {
    actions.push({
      message: "",
      delaySeconds: 0,
    });
  }

  return {
    id: backendAuto.id,
    name: backendAuto.name,
    enabled: backendAuto.enabled,
    createdAt: backendAuto.createdAt,
    keywords: keywords.length > 0 ? keywords : [{ keyword: "", matchType: "EXACT" }],
    actions,
  };
}

export function mapFrontendToBackend(values: {
  name: string;
  enabled: boolean;
  keywords: Array<{ keyword: string; matchType: "EXACT" | "CONTAINS" | "STARTS_WITH" }>;
  actions: Array<{ message: string; delaySeconds: number }>;
}) {
  // 1. triggers
  const triggers = [{ eventType: "MESSAGE_RECEIVED", enabled: true }];

  // 2. conditions (keywords)
  const conditions = (values.keywords || []).map((kw) => {
    let operator = "EQUALS";
    if (kw.matchType === "CONTAINS") operator = "CONTAINS";
    if (kw.matchType === "STARTS_WITH") operator = "STARTS_WITH";

    return {
      field: "content.text",
      operator,
      value: kw.keyword,
    };
  });

  // 3. actions (split delaySeconds into WAIT action and SEND_MESSAGE action)
  const actions: any[] = [];
  (values.actions || []).forEach((act) => {
    if (act.delaySeconds > 0) {
      actions.push({
        actionType: "WAIT",
        payload: {
          version: 1,
          type: "WAIT",
          data: {
            delaySeconds: Number(act.delaySeconds),
          },
        },
      });
    }

    actions.push({
      actionType: "SEND_MESSAGE",
      payload: {
        version: 1,
        type: "SEND_MESSAGE",
        data: {
          text: act.message,
        },
      },
    });
  });

  return {
    name: values.name,
    enabled: values.enabled,
    triggers,
    conditions,
    actions,
  };
}
