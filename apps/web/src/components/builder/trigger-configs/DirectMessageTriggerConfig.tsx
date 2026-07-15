import React, { useState } from "react";
import { Radio, Input, Button, Tag } from "antd";
import { Plus } from "lucide-react";

interface DirectMessageTriggerConfigProps {
  config: any;
  onChange: (config: any) => void;
}

export default function DirectMessageTriggerConfig({
  config,
  onChange,
}: DirectMessageTriggerConfigProps) {
  const mode = config?.mode || "ANY_MESSAGE";
  const keywords: string[] = config?.keywords || [];

  const [inputVal, setInputVal] = useState("");

  const handleModeChange = (newMode: string) => {
    if (newMode === "ANY_MESSAGE") {
      onChange({ mode: "ANY_MESSAGE" });
    } else {
      onChange({
        mode: "KEYWORD",
        keywords: keywords.length > 0 ? keywords : [],
      });
    }
  };

  const handleAddKeyword = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      const updated = [...keywords, trimmed];
      onChange({ mode: "KEYWORD", keywords: updated });
      setInputVal("");
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    const updated = keywords.filter((kw) => kw !== kwToRemove);
    onChange({ mode: "KEYWORD", keywords: updated });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <div>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          Direct Message Matching Mode
        </label>
        <Radio.Group
          value={mode}
          onChange={(e) => handleModeChange(e.target.value)}
          size="middle"
        >
          <Radio.Button value="ANY_MESSAGE">Any Message</Radio.Button>
          <Radio.Button value="KEYWORD">Keyword Match</Radio.Button>
        </Radio.Group>
      </div>

      {mode === "KEYWORD" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Trigger only when incoming DMs contain any of the following keyword
            tags:
          </span>
          <div
            style={{ display: "flex", gap: "var(--space-2)", maxWidth: 360 }}
          >
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. price, promo, info"
              onPressEnter={handleAddKeyword}
            />
            <Button
              type="dashed"
              icon={<Plus size={14} style={{ marginTop: 2 }} />}
              onClick={handleAddKeyword}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              Add
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-1)",
              marginTop: "var(--space-2)",
            }}
          >
            {keywords.map((kw) => (
              <Tag
                key={kw}
                closable
                onClose={() => handleRemoveKeyword(kw)}
                color="blue"
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {kw}
              </Tag>
            ))}
            {keywords.length === 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--warning)",
                  fontWeight: 550,
                }}
              >
                Please add at least one keyword to trigger the flow.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
