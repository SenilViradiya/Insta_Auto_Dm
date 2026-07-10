import React, { useState, useEffect } from 'react';
import { Steps, Button, Card, Input, Typography, Space, Alert, message } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { AutomationDraft, TriggerType, Condition, ActionItem } from './types';

import TriggerSelectionStep from './steps/TriggerSelectionStep';
import TriggerConfigStep from './steps/TriggerConfigStep';
import ConditionsStep from './steps/ConditionsStep';
import ActionsStep from './steps/ActionsStep';
import ReviewStep from './steps/ReviewStep';

const { Text, Title } = Typography;

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
  isSaving,
}: AutomationBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();

  // 1. Initialize draft state
  const [draft, setDraft] = useState<AutomationDraft>({
    metadata: { name: '', description: '' },
    trigger: { type: 'DIRECT_MESSAGE', config: { mode: 'ANY_MESSAGE' } },
    conditions: [],
    actions: [],
    review: { valid: false, warnings: [] },
  });

  // 2. Load initial data or localStorage drafts
  useEffect(() => {
    if (initialData) {
      // Map backend payload to draft structure
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

      setDraft({
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
      // Try local storage draft load
      const draftKey = `auto_draft:${instagramAccountId}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDraft(parsed);
        } catch {
          // ignore
        }
      }
    }
  }, [initialData, instagramAccountId]);

  // 3. Save draft to local storage on changes
  useEffect(() => {
    if (!initialData && instagramAccountId) {
      const draftKey = `auto_draft:${instagramAccountId}`;
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [draft, instagramAccountId, initialData]);

  // 4. State updates handlers
  const updateMetadata = (key: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value,
      },
    }));
  };

  const handleSelectTrigger = (type: TriggerType) => {
    // Initialize default configs to avoid empty objects errors
    let defaultConfig = {};
    if (type === 'DIRECT_MESSAGE') {
      defaultConfig = { mode: 'ANY_MESSAGE' };
    } else if (type === 'REEL_COMMENT') {
      defaultConfig = { mediaScope: 'ALL_REELS', matchType: 'ANY_COMMENT' };
    } else if (type === 'POST_COMMENT') {
      defaultConfig = { mediaScope: 'ALL_POSTS', matchType: 'ANY_COMMENT' };
    } else if (type === 'STORY_REPLY') {
      defaultConfig = { storyScope: 'ANY' };
    }

    setDraft((prev) => ({
      ...prev,
      trigger: {
        type,
        config: defaultConfig,
      },
    }));
  };

  const handleTriggerConfigChange = (newConfig: any) => {
    setDraft((prev) => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        config: newConfig,
      },
    }));
  };

  const handleConditionsChange = (conditions: Condition[]) => {
    setDraft((prev) => ({
      ...prev,
      conditions,
    }));
  };

  const handleActionsChange = (actions: ActionItem[]) => {
    setDraft((prev) => ({
      ...prev,
      actions,
    }));
  };

  const handleValidationChange = (valid: boolean, warnings: string[]) => {
    // Avoid loops by doing deep checks
    if (draft.review.valid !== valid || draft.review.warnings.length !== warnings.length) {
      setDraft((prev) => ({
        ...prev,
        review: { valid, warnings },
      }));
    }
  };

  // 5. Steps navigation controls
  const next = () => {
    if (currentStep === 0 && !draft.trigger.type) {
      messageApi.error('Please choose a trigger to proceed.');
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const prev = () => {
    setCurrentStep((prev) => prev - 1);
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
        localStorage.removeItem(`auto_draft:${instagramAccountId}`);
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
      <Card bordered={false} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
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
        </div>
      </Card>

      {/* Progress Steps Indicator */}
      <Card bordered={false} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
        <Steps current={currentStep} items={stepItems} />
      </Card>

      {/* Dynamic Render Steps Component */}
      <div style={{ minHeight: '350px' }}>
        {currentStep === 0 && (
          <TriggerSelectionStep
            selectedType={draft.trigger.type}
            onSelect={handleSelectTrigger}
          />
        )}

        {currentStep === 1 && (
          <TriggerConfigStep
            type={draft.trigger.type}
            config={draft.trigger.config}
            onChange={handleTriggerConfigChange}
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
      <Card bordered={false} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={prev}
            disabled={currentStep === 0}
            size="large"
          >
            Back
          </Button>

          <Space size="middle">
            {currentStep < 4 ? (
              <Button
                type="primary"
                onClick={next}
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
                loading={isSaving}
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
