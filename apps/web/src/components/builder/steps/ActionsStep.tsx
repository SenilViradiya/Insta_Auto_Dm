import React from "react";
import ActionBuilder from "../action-configs/ActionBuilder";
import { ActionItem } from "../types";

interface ActionsStepProps {
  actions: ActionItem[];
  onChange: (actions: ActionItem[]) => void;
}

export default function ActionsStep({ actions, onChange }: ActionsStepProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 var(--space-1) 0",
          }}
        >
          Configure Execution Actions
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
          Define the response payloads and delays in chronological sequence.
        </p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
        }}
      >
        <ActionBuilder actions={actions} onChange={onChange} />
      </div>
    </div>
  );
}
