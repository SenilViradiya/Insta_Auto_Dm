import React, { useEffect } from "react";
import { Input, message } from "antd";
import { Undo, Redo, ArrowLeft, ArrowRight, Save } from "lucide-react";
import { useBuilderStore, useUndoRedo } from "./builder.store";
import { TriggerType, Condition, ActionItem, AutomationDraft } from "./types";

import TriggerSelectionStep from "./steps/TriggerSelectionStep";
import TriggerConfigStep from "./steps/TriggerConfigStep";
import ConditionsStep from "./steps/ConditionsStep";
import ActionsStep from "./steps/ActionsStep";
import ReviewStep from "./steps/ReviewStep";

interface AutomationBuilderProps {
  instagramAccountId: string;
  activeAccountName: string;
  initialData?: any; // To populate form in edit mode
  onSave: (draft: AutomationDraft) => Promise<void>;
  isSaving: boolean;
}

export default function AutomationBuilder({
  instagramAccountId,
  activeAccountName,
  initialData,
  onSave,
  isSaving: initialSaving,
}: AutomationBuilderProps) {
  const [messageApi, contextHolder] = message.useMessage();

  // Zustand Store selectors
  const draft = useBuilderStore((state) => state.draft);
  const currentStep = useBuilderStore((state) => state.currentStep);
  const loadDraft = useBuilderStore((state) => state.loadDraft);
  const resetDraft = useBuilderStore((state) => state.resetDraft);
  const validate = useBuilderStore((state) => state.validate);
  const updateMetadata = useBuilderStore((state) => state.updateMetadata);
  const setTrigger = useBuilderStore((state) => state.setTrigger);
  const updateTriggerConfig = useBuilderStore(
    (state) => state.updateTriggerConfig,
  );
  const nextStep = useBuilderStore((state) => state.nextStep);
  const previousStep = useBuilderStore((state) => state.previousStep);
  const jumpToStep = useBuilderStore((state) => state.jumpToStep);

  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  // Load initial data (Edit Mode) or let draft recover automatically from LocalStorage
  useEffect(() => {
    if (initialData) {
      const parsedConfig = initialData.triggerConfig || {};

      const mappedActions: ActionItem[] = (initialData.actions || []).map(
        (act: any) => {
          const payloadData = act.payload?.data || {};
          return {
            id: act.id,
            actionType: act.actionType === "WAIT" ? "WAIT" : "SEND_MESSAGE",
            payload: {
              version: act.payload?.version ?? 1,
              type:
                act.payload?.type ??
                (act.actionType === "WAIT" ? "WAIT" : "SEND_MESSAGE"),
              data: {
                text: payloadData.text || payloadData.message || "",
                delaySeconds: payloadData.delaySeconds ?? 0,
              },
            },
          };
        },
      );

      const mappedConditions: Condition[] = (initialData.conditions || []).map(
        (cond: any) => {
          let opValue = cond.operator || "CONTAINS";
          if (opValue === "EQUALS") opValue = "EQUALS";
          return {
            field: cond.field || "content.text",
            operator: opValue,
            value: cond.value || "",
          };
        },
      );

      loadDraft({
        metadata: {
          name: initialData.name || "",
          description: initialData.description || "",
        },
        trigger: {
          type: initialData.triggerType || "DIRECT_MESSAGE",
          config: parsedConfig,
        },
        conditions: mappedConditions,
        actions: mappedActions,
        review: { valid: false, warnings: [] },
      });
    } else {
      validate();
    }
  }, [initialData, loadDraft, validate]);

  // Hook conditions change directly into Zustand actions
  const handleConditionsChange = (conditions: Condition[]) => {
    useBuilderStore.setState((state) => {
      const updatedDraft = { ...state.draft, conditions };
      return {
        draft: {
          ...updatedDraft,
          review: state.draft.review, // preserve or refine at validation time
        },
        isDirty: true,
      };
    });
    validate();
  };

  const handleActionsChange = (actions: ActionItem[]) => {
    useBuilderStore.setState((state) => {
      const updatedDraft = { ...state.draft, actions };
      return {
        draft: {
          ...updatedDraft,
          review: state.draft.review,
        },
        isDirty: true,
      };
    });
    validate();
  };

  const handleValidationChange = (valid: boolean, warnings: string[]) => {
    // Sync validation check status with store
    if (
      draft.review.valid !== valid ||
      draft.review.warnings.length !== warnings.length
    ) {
      useBuilderStore.setState((state) => ({
        draft: {
          ...state.draft,
          review: { valid, warnings },
        },
      }));
    }
  };

  // Steps navigation controls
  const handleNext = () => {
    if (currentStep === 0 && !draft.trigger.type) {
      messageApi.error("Please choose a trigger to proceed.");
      return;
    }
    nextStep();
  };

  const handleSave = async () => {
    if (!draft.review.valid) {
      messageApi.error(
        "Cannot save configuration. Please resolve all validation warnings.",
      );
      return;
    }
    try {
      await onSave(draft);
      // Remove drafted storage item
      if (!initialData) {
        localStorage.removeItem("builder-draft-store");
        resetDraft();
      }
    } catch (e: any) {
      messageApi.error(e.message || "Operation failed.");
    }
  };

  const stepsList = [
    { label: "Trigger Event" },
    { label: "Rules Config" },
    { label: "Conditions" },
    { label: "Actions Setup" },
    { label: "Final Review" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        width: "100%",
      }}
    >
      {contextHolder}

      {/* ── Metadata Setup ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-4)",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              flex: "2 1 300px",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 650,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Workflow Title
            </span>
            <Input
              value={draft.metadata.name}
              onChange={(e) => updateMetadata("name", e.target.value)}
              placeholder="e.g. Black Friday Campaign Discount Reply"
              size="large"
              style={{ fontWeight: 550 }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              flex: "3 1 350px",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 650,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Description Context
            </span>
            <Input
              value={draft.metadata.description || ""}
              onChange={(e) => updateMetadata("description", e.target.value)}
              placeholder="e.g. Automatically trigger coupon payload to target client comments"
              size="large"
            />
          </div>

          {/* Undo/Redo Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              alignSelf: "flex-end",
              height: 40,
            }}
          >
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                width: 36,
                height: 36,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: canUndo ? "var(--text-primary)" : "var(--text-muted)",
                cursor: canUndo ? "pointer" : "not-allowed",
                transition: "all var(--duration) var(--ease)",
                opacity: canUndo ? 1 : 0.5,
              }}
              title="Undo change (Ctrl+Z)"
              type="button"
            >
              <Undo size={15} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              style={{
                width: 36,
                height: 36,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: canRedo ? "var(--text-primary)" : "var(--text-muted)",
                cursor: canRedo ? "pointer" : "not-allowed",
                transition: "all var(--duration) var(--ease)",
                opacity: canRedo ? 1 : 0.5,
              }}
              title="Redo change (Ctrl+Y)"
              type="button"
            >
              <Redo size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Visual Steps Progress Tracker ── */}
      <div
        style={{
          background: "var(--surface)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          overflowX: "auto",
          gap: "var(--space-2)",
        }}
      >
        {stepsList.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={index}>
              <button
                onClick={() => jumpToStep(index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  transition: "all var(--duration) var(--ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                type="button"
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: isCurrent
                      ? "var(--primary)"
                      : isCompleted
                        ? "var(--hover-bg)"
                        : "var(--surface-secondary)",
                    color: isCurrent
                      ? "#fff"
                      : isCompleted
                        ? "var(--primary)"
                        : "var(--text-secondary)",
                    fontSize: 11,
                    fontWeight: 650,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {index + 1}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isCurrent ? 600 : 500,
                    color: isCurrent
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </span>
              </button>

              {index < stepsList.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    minWidth: 20,
                    background: "var(--border)",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Dynamic Render Steps Component ── */}
      <div style={{ minHeight: "340px" }}>
        {currentStep === 0 && (
          <TriggerSelectionStep
            selectedType={draft.trigger.type}
            onSelect={setTrigger}
          />
        )}

        {currentStep === 1 && (
          <TriggerConfigStep
            type={draft.trigger.type}
            config={draft.trigger.config}
            onChange={updateTriggerConfig}
            instagramAccountId={instagramAccountId}
          />
        )}

        {currentStep === 2 && (
          <ConditionsStep
            conditions={draft.conditions}
            onChange={handleConditionsChange}
          />
        )}

        {currentStep === 3 && (
          <ActionsStep actions={draft.actions} onChange={handleActionsChange} />
        )}

        {currentStep === 4 && (
          <ReviewStep
            draft={draft}
            activeAccountName={activeAccountName}
            onValidationChange={handleValidationChange}
          />
        )}
      </div>

      {/* ── Navigation Actions Footer ── */}
      <div
        style={{
          background: "var(--surface)",
          padding: "var(--space-4) var(--space-6)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={previousStep}
          disabled={currentStep === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "10px var(--space-5)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 500,
            cursor: currentStep === 0 ? "not-allowed" : "pointer",
            opacity: currentStep === 0 ? 0.5 : 1,
            transition: "all var(--duration) var(--ease)",
          }}
          onMouseEnter={(e) => {
            if (currentStep !== 0)
              e.currentTarget.style.background = "var(--surface-secondary)";
          }}
          onMouseLeave={(e) => {
            if (currentStep !== 0)
              e.currentTarget.style.background = "var(--surface)";
          }}
          type="button"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "10px var(--space-6)",
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
            Continue
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!draft.review.valid || initialSaving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "10px var(--space-6)",
              background: draft.review.valid
                ? "var(--success)"
                : "var(--text-muted)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 600,
              cursor: draft.review.valid ? "pointer" : "not-allowed",
              opacity: draft.review.valid ? 1 : 0.6,
              transition: "all var(--duration) var(--ease)",
            }}
            onMouseEnter={(e) => {
              if (draft.review.valid)
                e.currentTarget.style.background = "var(--success)";
            }}
            onMouseLeave={(e) => {
              if (draft.review.valid)
                e.currentTarget.style.background = "var(--success)";
            }}
            type="button"
          >
            <Save size={15} />
            {initialSaving ? "Saving..." : "Save Automation"}
          </button>
        )}
      </div>
    </div>
  );
}
