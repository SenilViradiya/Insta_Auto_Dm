import React, { useEffect } from 'react';
import { Steps, Button, Card, Input, Typography, Space, Tooltip, message } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { useBuilderStore, useUndoRedo } from './builder.store';
import { TriggerType, Condition, ActionItem, AutomationDraft } from './types';

import TriggerSelectionStep from './steps/TriggerSelectionStep';
import TriggerConfigStep from './steps/TriggerConfigStep';
import ConditionsStep from './steps/ConditionsStep';
import ActionsStep from './steps/ActionsStep';
import ReviewStep from './steps/ReviewStep';

const { Text } = Typography;

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
  const updateTriggerConfig = useBuilderStore((state) => state.updateTriggerConfig);
  const nextStep = useBuilderStore((state) => state.nextStep);
  const previousStep = useBuilderStore((state) => state.previousStep);
  const jumpToStep = useBuilderStore((state) => state.jumpToStep);

  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  // Load initial data (Edit Mode) or let draft recover automatically from LocalStorage
  useEffect(() => {
    if (initialData) {
      const parsedConfig = initialData.triggerConfig || {};
      
      const mappedActions: ActionItem[] = (initialData.actions || []).map((act: any) => {
        const payloadData = act.payload?.data || {};
        return {
          id: act.id,
          actionType: act.actionType === 'WAIT' ? 'WAIT' : 'SEND_MESSAGE',
          payload: {
            version: act.payload?.version ?? 1,
            type: act.payload?.type ?? (act.actionType === 'WAIT' ? 'WAIT' : 'SEND_MESSAGE'),
            data: {
              text: payloadData.text || payloadData.message || '',
              delaySeconds: payloadData.delaySeconds ?? 0,
            },
          },
        };
      });

      const mappedConditions: Condition[] = (initialData.conditions || []).map((cond: any) => {
        let opValue = cond.operator || 'CONTAINS';
        if (opValue === 'EQUALS') opValue = 'EQUALS';
        return {
          field: cond.field || 'content.text',
          operator: opValue,
          value: cond.value || '',
        };
      });

      loadDraft({
        metadata: {
          name: initialData.name || '',
          description: initialData.description || '',
        },
        trigger: {
          type: initialData.triggerType || 'DIRECT_MESSAGE',
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
    if (draft.review.valid !== valid || draft.review.warnings.length !== warnings.length) {
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
      messageApi.error('Please choose a trigger to proceed.');
      return;
    }
    nextStep();
  };

  const handleSave = async () => {
    if (!draft.review.valid) {
      messageApi.error('Cannot save configuration. Please resolve all validation warnings.');
      return;
    }
    try {
      await onSave(draft);
      // Remove drafted storage item
      if (!initialData) {
        localStorage.removeItem('builder-draft-store');
        resetDraft();
      }
    } catch (e: any) {
      messageApi.error(e.message || 'Operation failed.');
    }
  };

  const stepItems = [
    { title: 'Trigger Event' },
    { title: 'Trigger Setup' },
    { title: 'Condition Rules' },
    { title: 'Actions Sequence' },
    { title: 'Review & Save' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {contextHolder}

      {/* Basic flow details editor (Permanent top header row) */}
      <Card variant="borderless" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '250px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>FLOW NAME</span>
            <Input
              value={draft.metadata.name}
              onChange={(e) => updateMetadata('name', e.target.value)}
              placeholder="e.g. Campaign Black Friday discount reply"
              size="large"
              style={{ fontWeight: 600 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '250px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>DESCRIPTION (OPTIONAL)</span>
            <Input
              value={draft.metadata.description || ''}
              onChange={(e) => updateMetadata('description', e.target.value)}
              placeholder="Brief summary of flow execution rules"
              size="large"
            />
          </div>
          {/* Undo/Redo Toolbar Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
            <Tooltip title="Undo (Ctrl+Z)">
              <Button
                icon={<UndoOutlined />}
                disabled={!canUndo}
                onClick={undo}
                style={{ borderRadius: '8px' }}
              />
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <Button
                icon={<RedoOutlined />}
                disabled={!canRedo}
                onClick={redo}
                style={{ borderRadius: '8px' }}
              />
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* Progress Steps Indicator */}
      <Card variant="borderless" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
        <Steps current={currentStep} items={stepItems} onChange={jumpToStep} style={{ cursor: 'pointer' }} />
      </Card>

      {/* Dynamic Render Steps Component */}
      <div style={{ minHeight: '350px' }}>
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
          <ActionsStep
            actions={draft.actions}
            onChange={handleActionsChange}
          />
        )}

        {currentStep === 4 && (
          <ReviewStep
            draft={draft}
            activeAccountName={activeAccountName}
            onValidationChange={handleValidationChange}
          />
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <Card variant="borderless" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={previousStep}
            disabled={currentStep === 0}
            size="large"
          >
            Back
          </Button>

          <Space size="middle">
            {currentStep < 4 ? (
              <Button
                type="primary"
                onClick={handleNext}
                size="large"
                style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
              >
                Continue <ArrowRightOutlined />
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={initialSaving}
                disabled={!draft.review.valid}
                size="large"
                style={{
                  background: draft.review.valid ? '#10b981' : '#cbd5e1',
                  borderColor: draft.review.valid ? '#10b981' : '#cbd5e1',
                  fontWeight: 'bold',
                }}
              >
                Save Automation
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
}
