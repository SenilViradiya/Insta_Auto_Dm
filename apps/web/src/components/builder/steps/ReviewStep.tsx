import React, { useEffect } from "react";
import { TRIGGER_REGISTRY } from "../TriggerRegistry";
import { AutomationDraft } from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  Zap,
  Instagram,
  Tag,
  ArrowRight,
  Clock,
  Send,
  MessageSquare,
} from "lucide-react";

interface ReviewStepProps {
  draft: AutomationDraft;
  activeAccountName: string;
  onValidationChange: (valid: boolean, warnings: string[]) => void;
}

export default function ReviewStep({
  draft,
  activeAccountName,
  onValidationChange,
}: ReviewStepProps) {
  // Run validation rules
  const warnings: string[] = [];

  if (!draft.metadata.name.trim()) {
    warnings.push("Flow Name is required.");
  }

  if (!draft.trigger.type) {
    warnings.push("A trigger type must be selected.");
  } else {
    const config = draft.trigger.config || {};
    if (draft.trigger.type === "DIRECT_MESSAGE") {
      if (
        config.mode === "KEYWORD" &&
        (!config.keywords || config.keywords.length === 0)
      ) {
        warnings.push(
          "Keyword matching mode requires at least one keyword trigger tag.",
        );
      }
    } else if (
      draft.trigger.type === "REEL_COMMENT" ||
      draft.trigger.type === "POST_COMMENT"
    ) {
      if (config.mediaScope === "SPECIFIC_REEL" && !config.mediaId) {
        warnings.push("A specific Reel asset must be chosen.");
      }
      if (config.mediaScope === "SPECIFIC_POST" && !config.mediaId) {
        warnings.push("A specific Feed Post asset must be chosen.");
      }
      if (
        config.matchType === "KEYWORD" &&
        (!config.keywords || config.keywords.length === 0)
      ) {
        warnings.push(
          "Comment keyword match mode requires at least one comment keyword filter.",
        );
      }
    }
  }

  if (!draft.actions || draft.actions.length === 0) {
    warnings.push("At least one action is required in the execution pipeline.");
  } else {
    draft.actions.forEach((act, idx) => {
      if (act.actionType === "SEND_MESSAGE" && !act.payload.data.text?.trim()) {
        warnings.push(
          `Action Step ${idx + 1} (Send Message) text payload is currently empty.`,
        );
      }
      if (act.actionType === "REPLY_COMMENT" && !act.payload.data.text?.trim()) {
        warnings.push(
          `Action Step ${idx + 1} (Reply Comment) text payload is currently empty.`,
        );
      }
      if (
        act.actionType === "WAIT" &&
        (act.payload.data.delaySeconds ?? 0) <= 0
      ) {
        warnings.push(
          `Action Step ${idx + 1} (Delay Timer) must be greater than 0.`,
        );
      }
    });
  }

  const isValid = warnings.length === 0;

  useEffect(() => {
    onValidationChange(isValid, warnings);
  }, [isValid, warnings.join("|")]);

  const triggerMeta = draft.trigger.type
    ? TRIGGER_REGISTRY[draft.trigger.type]
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* Step Header */}
      <div>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 var(--space-1) 0",
          }}
        >
          Review Automation Flow
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
          Verify your configuration settings and execution path before saving.
        </p>
      </div>

      {/* ── Validation Alerts ── */}
      {isValid ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-5)",
            background: "var(--success-bg)",
            border: "1px solid #BBF7D0",
            borderRadius: "var(--radius-md)",
            color: "var(--success)",
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Validation Passed
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              All configuration requirements are met. The flow is ready to be
              saved and activated.
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-5)",
            background: "var(--danger-bg)",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            color: "var(--danger)",
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Configuration Validation Failed
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              {warnings.map((warn, i) => (
                <span
                  key={i}
                  style={{ fontSize: 12, color: "var(--text-secondary)" }}
                >
                  • {warn}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Visual Execution Path ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {/* METADATA BLOCK */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 650,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Automation Name
            </span>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginTop: 2,
              }}
            >
              {draft.metadata.name || (
                <span style={{ color: "var(--danger)", fontWeight: 500 }}>
                  Name missing
                </span>
              )}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 650,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "block",
              }}
            >
              Instagram Target Scope
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginTop: 2,
              }}
            >
              <Instagram size={14} color="var(--primary)" />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {activeAccountName || "Default account context"}
              </span>
            </div>
          </div>
        </div>

        {/* CONNECTED EXECUTION STEPS */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
          }}
        >
          {/* STEP 1: WHEN Trigger */}
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--hover-bg)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 650,
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div
                style={{
                  width: 2,
                  flex: 1,
                  background: "var(--divider)",
                  marginTop: "var(--space-1)",
                }}
              />
            </div>

            <div style={{ flex: 1, paddingBottom: "var(--space-3)" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                WHEN Trigger Event Occurs
              </span>
              {triggerMeta ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    marginTop: "var(--space-2)",
                  }}
                >
                  <div style={{ color: "var(--primary)" }}>
                    {triggerMeta.icon}
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {triggerMeta.title}
                    </span>
                    {draft.trigger.type === "DIRECT_MESSAGE" && (
                      <span
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        Mode:{" "}
                        <strong>
                          {draft.trigger.config?.mode || "ANY_MESSAGE"}
                        </strong>
                        {draft.trigger.config?.mode === "KEYWORD" && (
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                              marginTop: 4,
                            }}
                          >
                            {(draft.trigger.config?.keywords || []).map(
                              (kw: string) => (
                                <span
                                  key={kw}
                                  style={{
                                    fontSize: 11,
                                    background: "var(--hover-bg)",
                                    color: "var(--primary)",
                                    padding: "1px 6px",
                                    borderRadius: "var(--radius-sm)",
                                  }}
                                >
                                  {kw}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </span>
                    )}

                    {(draft.trigger.type === "REEL_COMMENT" ||
                      draft.trigger.type === "POST_COMMENT") && (
                      <span
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        Matching comment scope:{" "}
                        <strong>
                          {draft.trigger.config?.matchType || "ANY"}
                        </strong>{" "}
                        (Targeting:{" "}
                        <strong>
                          {draft.trigger.config?.mediaScope || "ALL"}
                        </strong>
                        )
                        {draft.trigger.config?.keywords &&
                          draft.trigger.config.keywords.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                flexWrap: "wrap",
                                marginTop: 4,
                              }}
                            >
                              {draft.trigger.config.keywords.map(
                                (kw: string) => (
                                  <span
                                    key={kw}
                                    style={{
                                      fontSize: 11,
                                      background: "var(--hover-bg)",
                                      color: "var(--primary)",
                                      padding: "1px 6px",
                                      borderRadius: "var(--radius-sm)",
                                    }}
                                  >
                                    {kw}
                                  </span>
                                ),
                              )}
                            </div>
                          )}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--danger)",
                    marginTop: "var(--space-1)",
                  }}
                >
                  No trigger chosen yet.
                </span>
              )}
            </div>
          </div>

          {/* STEP 2: IF Conditions */}
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--surface-secondary)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 650,
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div
                style={{
                  width: 2,
                  flex: 1,
                  background: "var(--divider)",
                  marginTop: "var(--space-1)",
                }}
              />
            </div>

            <div style={{ flex: 1, paddingBottom: "var(--space-3)" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                AND IF Filter Rules Pass
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  marginTop: "var(--space-2)",
                }}
              >
                {draft.conditions && draft.conditions.length > 0 ? (
                  draft.conditions.map((cond, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 550,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {cond.field}
                      </span>
                      <code
                        style={{
                          fontSize: 11,
                          color: "var(--primary)",
                          background: "var(--hover-bg)",
                          padding: "1px 4px",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        {cond.operator}
                      </code>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        "{cond.value}"
                      </span>
                    </div>
                  ))
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    No filter rules applied. Automation triggers
                    unconditionally.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: THEN Action Pipeline */}
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--surface-secondary)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 650,
                  flexShrink: 0,
                }}
              >
                3
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                THEN Dispatch Actions Sequentially
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                  marginTop: "var(--space-2)",
                }}
              >
                {draft.actions && draft.actions.length > 0 ? (
                  draft.actions.map((act, index) => {
                    const isMsg = act.actionType === "SEND_MESSAGE";
                    const isReply = act.actionType === "REPLY_COMMENT";
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "var(--space-3)",
                          padding: "var(--space-3) var(--space-4)",
                          background: "var(--surface-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "var(--radius-sm)",
                            background: (isMsg || isReply)
                              ? "var(--hover-bg)"
                              : "var(--warning-bg)",
                            color: (isMsg || isReply) ? "var(--primary)" : "var(--warning)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {isMsg ? <Send size={11} /> : isReply ? <MessageSquare size={11} /> : <Clock size={11} />}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            Step {index + 1}:{" "}
                            {isMsg ? "Send Direct Message" : isReply ? "Public Reply Comment" : "Delay Timer"}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                              fontStyle: (isMsg || isReply) ? "italic" : "normal",
                            }}
                          >
                            {isMsg || isReply
                              ? `"${act.payload.data.text}"`
                              : `Wait for ${act.payload.data.delaySeconds} seconds before continuing`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--danger)",
                      fontWeight: 500,
                    }}
                  >
                    * At least one action must be added to trigger execution.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
