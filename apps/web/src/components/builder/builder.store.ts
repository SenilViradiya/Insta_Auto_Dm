import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AutomationDraft, TriggerType, Condition, ActionItem } from "./types";

export interface BuilderState {
  draft: AutomationDraft;
  currentStep: number;
  isDirty: boolean;
  isSaving: boolean;
  undoStack: AutomationDraft[];
  redoStack: AutomationDraft[];
  lastSaved: string | null;

  // Actions
  setTrigger: (type: TriggerType) => void;
  updateTriggerConfig: (config: any) => void;
  updateMetadata: (key: "name" | "description", value: string) => void;
  addCondition: (condition: Condition) => void;
  removeCondition: (index: number) => void;
  updateCondition: (index: number, condition: Partial<Condition>) => void;
  addAction: (action: ActionItem) => void;
  removeAction: (index: number) => void;
  updateAction: (index: number, action: Partial<ActionItem>) => void;
  nextStep: () => void;
  previousStep: () => void;
  jumpToStep: (step: number) => void;
  resetDraft: (instagramAccountId?: string) => void;
  loadDraft: (draft: AutomationDraft) => void;
  markDirty: (isDirty: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setLastSaved: (timestamp: string | null) => void;
  validate: () => void;
  undo: () => void;
  redo: () => void;
}

const initialDraft = (): AutomationDraft => ({
  metadata: { name: "", description: "" },
  trigger: { type: "DIRECT_MESSAGE", config: { mode: "ANY_MESSAGE" } },
  conditions: [],
  actions: [],
  review: { valid: false, warnings: [] },
});

// Helper validation logic
const runValidation = (
  draft: AutomationDraft,
): { valid: boolean; warnings: string[] } => {
  const warnings: string[] = [];

  if (!draft.metadata.name || draft.metadata.name.trim() === "") {
    warnings.push("Automation name is required.");
  }

  if (!draft.trigger.type) {
    warnings.push("A trigger event type must be selected.");
  }

  draft.conditions.forEach((c, index) => {
    if (!c.value || c.value.trim() === "") {
      warnings.push(`Condition ${index + 1} is missing a value.`);
    }
  });

  if (draft.actions.length === 0) {
    warnings.push("At least one action is required in the sequence.");
  }

  draft.actions.forEach((act, index) => {
    if (act.actionType === "SEND_MESSAGE") {
      if (!act.payload.data.text || act.payload.data.text.trim() === "") {
        warnings.push(`Action ${index + 1} (Send Message) text is empty.`);
      }
    } else if (act.actionType === "REPLY_COMMENT") {
      if (!act.payload.data.text || act.payload.data.text.trim() === "") {
        warnings.push(`Action ${index + 1} (Reply Comment) text is empty.`);
      }
    } else if (act.actionType === "WAIT") {
      const delay = act.payload.data.delaySeconds;
      if (delay === undefined || delay < 0) {
        warnings.push(
          `Action ${index + 1} (Wait) requires positive delay seconds.`,
        );
      }
    }
  });

  return {
    valid: warnings.length === 0,
    warnings,
  };
};

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => {
      const pushToUndo = (currentDraft: AutomationDraft) => {
        const { undoStack } = get();
        // Limit undo stack to 50 items to optimize memory
        const nextUndo = [
          ...undoStack,
          JSON.parse(JSON.stringify(currentDraft)),
        ].slice(-50);
        set({ undoStack: nextUndo, redoStack: [] });
      };

      return {
        draft: initialDraft(),
        currentStep: 0,
        isDirty: false,
        isSaving: false,
        undoStack: [],
        redoStack: [],
        lastSaved: null,

        setTrigger: (type: TriggerType) => {
          const current = get().draft;
          pushToUndo(current);

          let defaultConfig = {};
          if (type === "DIRECT_MESSAGE") {
            defaultConfig = { mode: "ANY_MESSAGE" };
          } else if (type === "REEL_COMMENT") {
            defaultConfig = {
              mediaScope: "ALL_REELS",
              matchType: "ANY_COMMENT",
            };
          } else if (type === "POST_COMMENT") {
            defaultConfig = {
              mediaScope: "ALL_POSTS",
              matchType: "ANY_COMMENT",
            };
          } else if (type === "STORY_REPLY") {
            defaultConfig = { storyScope: "ANY" };
          }

          const nextDraft = {
            ...current,
            trigger: {
              type,
              config: defaultConfig,
            },
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        updateTriggerConfig: (config: any) => {
          const current = get().draft;
          pushToUndo(current);

          const nextDraft = {
            ...current,
            trigger: {
              ...current.trigger,
              config,
            },
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        updateMetadata: (key: "name" | "description", value: string) => {
          const current = get().draft;
          // Avoid pushing duplicate states on keypress
          const nextDraft = {
            ...current,
            metadata: {
              ...current.metadata,
              [key]: value,
            },
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        addCondition: (condition: Condition) => {
          const current = get().draft;
          pushToUndo(current);

          const nextDraft = {
            ...current,
            conditions: [...current.conditions, condition],
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        removeCondition: (index: number) => {
          const current = get().draft;
          pushToUndo(current);

          const nextConditions = [...current.conditions];
          nextConditions.splice(index, 1);

          const nextDraft = {
            ...current,
            conditions: nextConditions,
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        updateCondition: (index: number, condition: Partial<Condition>) => {
          const current = get().draft;
          pushToUndo(current);

          const nextConditions = current.conditions.map((item, cIndex) => {
            if (cIndex === index) {
              return { ...item, ...condition };
            }
            return item;
          });

          const nextDraft = {
            ...current,
            conditions: nextConditions,
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        addAction: (action: ActionItem) => {
          const current = get().draft;
          pushToUndo(current);

          const nextDraft = {
            ...current,
            actions: [...current.actions, action],
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        removeAction: (index: number) => {
          const current = get().draft;
          pushToUndo(current);

          const nextActions = [...current.actions];
          nextActions.splice(index, 1);

          const nextDraft = {
            ...current,
            actions: nextActions,
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        updateAction: (index: number, action: Partial<ActionItem>) => {
          const current = get().draft;
          pushToUndo(current);

          const nextActions = current.actions.map((item, actIndex) => {
            if (actIndex === index) {
              const mergedPayload = {
                ...item.payload,
                ...action.payload,
                data: {
                  ...item.payload?.data,
                  ...action.payload?.data,
                },
              };
              return {
                ...item,
                ...action,
                payload: mergedPayload,
              } as ActionItem;
            }
            return item;
          });

          const nextDraft = {
            ...current,
            actions: nextActions,
          };

          const review = runValidation(nextDraft);
          nextDraft.review = review;

          set({ draft: nextDraft, isDirty: true });
        },

        nextStep: () => {
          const { currentStep } = get();
          set({ currentStep: currentStep + 1 });
        },

        previousStep: () => {
          const { currentStep } = get();
          if (currentStep > 0) {
            set({ currentStep: currentStep - 1 });
          }
        },

        jumpToStep: (step: number) => {
          set({ currentStep: step });
        },

        resetDraft: (instagramAccountId?: string) => {
          set({
            draft: initialDraft(),
            currentStep: 0,
            isDirty: false,
            undoStack: [],
            redoStack: [],
            lastSaved: null,
          });
        },

        loadDraft: (loadedDraft: AutomationDraft) => {
          const review = runValidation(loadedDraft);
          set({
            draft: {
              ...loadedDraft,
              review,
            },
            currentStep: 0,
            isDirty: false,
            undoStack: [],
            redoStack: [],
          });
        },

        markDirty: (isDirty: boolean) => {
          set({ isDirty });
        },

        setSaving: (isSaving: boolean) => {
          set({ isSaving });
        },

        setLastSaved: (timestamp: string | null) => {
          set({ lastSaved: timestamp });
        },

        validate: () => {
          const current = get().draft;
          const review = runValidation(current);
          set({
            draft: {
              ...current,
              review,
            },
          });
        },

        undo: () => {
          const { undoStack, draft, redoStack } = get();
          if (undoStack.length === 0) return;

          const previous = undoStack[undoStack.length - 1];
          const newUndo = undoStack.slice(0, -1);
          const newRedo = [...redoStack, JSON.parse(JSON.stringify(draft))];

          set({
            draft: previous,
            undoStack: newUndo,
            redoStack: newRedo,
            isDirty: true,
          });
        },

        redo: () => {
          const { redoStack, draft, undoStack } = get();
          if (redoStack.length === 0) return;

          const next = redoStack[redoStack.length - 1];
          const newRedo = redoStack.slice(0, -1);
          const newUndo = [...undoStack, JSON.parse(JSON.stringify(draft))];

          set({
            draft: next,
            undoStack: newUndo,
            redoStack: newRedo,
            isDirty: true,
          });
        },
      };
    },
    {
      name: "builder-draft-store",
      storage: createJSONStorage(() => localStorage),
      // Schema versioning & future migration support
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          // Future migrations logic can perform structural translations here
        }
        return persistedState;
      },
    },
  ),
);

// Memoized custom hooks selectors for optimized rendering performance
export const useTrigger = () => useBuilderStore((state) => state.draft.trigger);
export const useConditions = () =>
  useBuilderStore((state) => state.draft.conditions);
export const useActions = () => useBuilderStore((state) => state.draft.actions);
export const useReview = () => useBuilderStore((state) => state.draft.review);
export const useCurrentStep = () =>
  useBuilderStore((state) => state.currentStep);
export const useMetadata = () =>
  useBuilderStore((state) => state.draft.metadata);
export const useIsDirty = () => useBuilderStore((state) => state.isDirty);
export const useUndoRedo = () => {
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const canUndo = useBuilderStore((state) => state.undoStack.length > 0);
  const canRedo = useBuilderStore((state) => state.redoStack.length > 0);
  return { canUndo, canRedo, undo, redo };
};
