import React from "react";
import { Button, Select, Input } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { Condition } from "../types";import { useBuilderStore } from "../builder.store";

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

const OPERATOR_OPTIONS = [
  { label: "Equals", value: "EQUALS" },
  { label: "Contains", value: "CONTAINS" },
  { label: "Starts With", value: "STARTS_WITH" },
  { label: "Ends With", value: "ENDS_WITH" },
  { label: "Matches Regex", value: "REGEX" },
];

export default function ConditionBuilder({
  conditions = [],
  onChange,
}: ConditionBuilderProps) {
  const triggerType = useBuilderStore((state) => state.draft.trigger.type);

  const getFieldOptions = () => {
    switch (triggerType) {
      case "REEL_COMMENT":
      case "POST_COMMENT":
        return [
          { label: "Comment Text", value: "content.text" },
          { label: "Sender Username", value: "sender.username" },
        ];
      case "STORY_REPLY":
        return [
          { label: "Reply Text", value: "content.text" },
          { label: "Sender Username", value: "sender.username" },
        ];
      case "DIRECT_MESSAGE":
        return [
          { label: "Message Text", value: "content.text" },
          { label: "Sender Username", value: "sender.username" },
        ];
      default:
        return [
          { label: "Content Text", value: "content.text" },
          { label: "Sender Username", value: "sender.username" },
        ];
    }
  };

  const fieldOptions = getFieldOptions();

  const handleAddCondition = () => {
    const newCond: Condition = {
      field: "content.text",
      operator: "CONTAINS",
      value: "",
    };
    onChange([...conditions, newCond]);
  };

  const handleRemoveCondition = (index: number) => {
    const updated = conditions.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleUpdateCondition = (
    index: number,
    updates: Partial<Condition>,
  ) => {
    const updated = conditions.map((cond, idx) => {
      if (idx === index) {
        return { ...cond, ...updates };
      }
      return cond;
    });
    onChange(updated);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          margin: "0 0 var(--space-2) 0",
        }}
      >
        Configure filter criteria for executing this message flow:
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {conditions.map((cond, index) => (
          <div
            key={index}
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-4)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "var(--space-3)",
            }}
          >
            {/* Field */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
                flex: "1 1 200px",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  color: "var(--text-secondary)",
                }}
              >
                FieldName
              </span>
              <Select
                value={cond.field}
                onChange={(val) => handleUpdateCondition(index, { field: val })}
                options={fieldOptions}
                style={{ width: "100%" }}
              />
            </div>

            {/* Operator */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
                flex: "1 1 150px",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  color: "var(--text-secondary)",
                }}
              >
                Operator
              </span>
              <Select
                value={cond.operator}
                onChange={(val) =>
                  handleUpdateCondition(index, { operator: val as any })
                }
                options={OPERATOR_OPTIONS}
                style={{ width: "100%" }}
              />
            </div>

            {/* Match Value */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
                flex: "2 1 250px",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  color: "var(--text-secondary)",
                }}
              >
                Matching Value
              </span>
              <Input
                value={cond.value}
                onChange={(e) =>
                  handleUpdateCondition(index, { value: e.target.value })
                }
                placeholder="e.g. discount, promo"
              />
            </div>

            {/* Remove */}
            <button
              onClick={() => handleRemoveCondition(index)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-2)",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all var(--duration) var(--ease)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--danger)";
                e.currentTarget.style.color = "var(--danger)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
              type="button"
              aria-label="Remove condition"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {conditions.length === 0 && (
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
              No filter conditions. Automation runs unconditionally for all
              matching triggers.
            </span>
          </div>
        )}
      </div>

      <div style={{ marginTop: "var(--space-1)" }}>
        <button
          onClick={handleAddCondition}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "8px 16px",
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
          <Plus size={14} />
          Add Condition Rule
        </button>
      </div>
    </div>
  );
}
