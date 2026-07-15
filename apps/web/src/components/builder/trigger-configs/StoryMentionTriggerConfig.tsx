import React from "react";
import { Info } from "lucide-react";

interface StoryMentionTriggerConfigProps {
  config: any;
  onChange: (config: any) => void;
}

export default function StoryMentionTriggerConfig({
  config,
  onChange,
}: StoryMentionTriggerConfigProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <div>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "var(--space-1)",
          }}
        >
          Story Mention Settings
        </span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          No additional configuration required for Story Mention triggers.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-5)",
          background: "var(--hover-bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          color: "var(--primary)",
        }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          The flow will run instantly as soon as someone publishes a story
          mentioning your linked Instagram handle.
        </span>
      </div>
    </div>
  );
}
