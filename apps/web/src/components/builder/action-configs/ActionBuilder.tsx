import React from "react";
import { Input, InputNumber } from "antd";
import {
  Plus,
  Trash2,
  Send,
  Clock,
  ArrowDown,
  Bot,
  Webhook,
  Tag,
  UserCheck,
} from "lucide-react";
import { ActionItem, ActionType } from "../types";

const { TextArea } = Input;

interface ActionBuilderProps {
  actions: ActionItem[];
  onChange: (actions: ActionItem[]) => void;
}

export default function ActionBuilder({
  actions = [],
  onChange,
}: ActionBuilderProps) {
  const handleAddAction = (actionType: ActionType) => {
    let newItem: ActionItem;
    if (actionType === "SEND_MESSAGE") {
      newItem = {
        actionType: "SEND_MESSAGE",
        payload: {
          version: 1,
          type: "SEND_MESSAGE",
          data: {
            text: "",
          },
        },
      };
    } else {
      newItem = {
        actionType: "WAIT",
        payload: {
          version: 1,
          type: "WAIT",
          data: {
            delaySeconds: 10,
          },
        },
      };
    }
    onChange([...actions, newItem]);
  };

  const handleRemoveAction = (index: number) => {
    const updated = actions.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleUpdateActionData = (index: number, dataUpdates: any) => {
    const updated = actions.map((act, idx) => {
      if (idx === index) {
        return {
          ...act,
          payload: {
            ...act.payload,
            data: {
              ...act.payload.data,
              ...dataUpdates,
            },
          },
        };
      }
      return act;
    });
    onChange(updated);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* Sequence Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {actions.map((act, index) => {
          const isMsg = act.actionType === "SEND_MESSAGE";
          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
              }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                {/* Step Header info */}
                <div
                  style={{
                    background: "var(--surface-secondary)",
                    borderBottom: "1px solid var(--border)",
                    padding: "var(--space-3) var(--space-4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "var(--radius-sm)",
                        background: isMsg
                          ? "var(--hover-bg)"
                          : "var(--warning-bg)",
                        color: isMsg ? "var(--primary)" : "var(--warning)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isMsg ? <Send size={13} /> : <Clock size={13} />}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      Step {index + 1}:{" "}
                      {isMsg ? "Send Direct Message" : "Delay Timer"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveAction(index)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 4,
                      borderRadius: "var(--radius-sm)",
                      transition: "all var(--duration) var(--ease)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--danger)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-muted)";
                    }}
                    type="button"
                    aria-label={`Remove step ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Step Body */}
                <div style={{ padding: "var(--space-5)" }}>
                  {isMsg ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                      }}
                    >
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 550,
                          color: "var(--text-secondary)",
                        }}
                      >
                        Response Message Contents
                      </label>
                      <TextArea
                        value={act.payload.data.text || ""}
                        onChange={(e) =>
                          handleUpdateActionData(index, {
                            text: e.target.value,
                          })
                        }
                        placeholder="Write the DM content to dispatch to client..."
                        rows={3}
                        style={{ borderRadius: "var(--radius-md)" }}
                      />
                      {!act.payload.data.text && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--danger)",
                            fontWeight: 500,
                          }}
                        >
                          * Message content text represents a required
                          parameter.
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                      }}
                    >
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 550,
                          color: "var(--text-secondary)",
                        }}
                      >
                        Delay Configuration
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                        }}
                      >
                        <InputNumber
                          value={act.payload.data.delaySeconds || 0}
                          onChange={(val) =>
                            handleUpdateActionData(index, {
                              delaySeconds: val || 0,
                            })
                          }
                          min={1}
                          max={86400}
                          style={{ width: "130px" }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}
                        >
                          seconds execution delay
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Vertical connector line */}
              {index < actions.length - 1 && (
                <div
                  className="pipeline-connector"
                  style={{ margin: "var(--space-2) auto" }}
                />
              )}
            </div>
          );
        })}

        {actions.length === 0 && (
          <div
            style={{
              padding: "var(--space-8)",
              textAlign: "center",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-secondary)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              No execution steps in pipeline. Select an execution step type
              below to begin.
            </span>
          </div>
        )}
      </div>

      {/* Selector Grid */}
      <div
        style={{
          borderTop: "1px solid var(--divider)",
          paddingTop: "var(--space-6)",
        }}
      >
        <h4
          style={{
            fontSize: 13,
            fontWeight: 650,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-4)",
          }}
        >
          Add Pipeline Step
        </h4>

        {/* Buttons Panel */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          <button
            onClick={() => handleAddAction("SEND_MESSAGE")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              padding: "10px var(--space-4)",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all var(--duration) var(--ease)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--primary)";
            }}
            type="button"
          >
            <Send size={14} />
            Send Message
          </button>

          <button
            onClick={() => handleAddAction("WAIT")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              padding: "10px var(--space-4)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              cursor: "pointer",
              transition: "all var(--duration) var(--ease)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface)";
            }}
            type="button"
          >
            <Clock size={14} />
            Wait Delay
          </button>

          {/* Placeholders */}
          <button
            disabled
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              padding: "10px var(--space-4)",
              background: "var(--surface-secondary)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-muted)",
              cursor: "not-allowed",
            }}
            title="AI responses (Coming Soon)"
            type="button"
          >
            <Bot size={14} />
            AI Reply
          </button>

          <button
            disabled
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              padding: "10px var(--space-4)",
              background: "var(--surface-secondary)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-muted)",
              cursor: "not-allowed",
            }}
            title="Webhooks integration (Coming Soon)"
            type="button"
          >
            <Webhook size={14} />
            Webhook
          </button>

          <button
            disabled
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              padding: "10px var(--space-4)",
              background: "var(--surface-secondary)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-muted)",
              cursor: "not-allowed",
            }}
            title="CRM handoff (Coming Soon)"
            type="button"
          >
            <UserCheck size={14} />
            CRM Handoff
          </button>
        </div>
      </div>
    </div>
  );
}
