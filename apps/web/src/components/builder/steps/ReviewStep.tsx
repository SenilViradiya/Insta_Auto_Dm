import React, { useEffect } from 'react';
import { Card, Typography, Descriptions, List, Tag, Alert, Row, Col, Space, Divider } from 'antd';
import { TRIGGER_REGISTRY } from '../TriggerRegistry';
import { AutomationDraft } from '../types';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  InstagramOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

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
    warnings.push('Flow Name is required in the review setup.');
  }

  if (!draft.trigger.type) {
    warnings.push('A trigger type must be selected.');
  } else {
    const config = draft.trigger.config || {};
    if (draft.trigger.type === 'DIRECT_MESSAGE') {
      if (config.mode === 'KEYWORD' && (!config.keywords || config.keywords.length === 0)) {
        warnings.push('Keyword match mode requires at least one keyword trigger.');
      }
    } else if (draft.trigger.type === 'REEL_COMMENT' || draft.trigger.type === 'POST_COMMENT') {
      if (config.mediaScope === 'SPECIFIC_REEL' && !config.mediaId) {
        warnings.push('A specific Reel asset must be chosen.');
      }
      if (config.mediaScope === 'SPECIFIC_POST' && !config.mediaId) {
        warnings.push('A specific Feed Post asset must be chosen.');
      }
      if (config.matchType === 'KEYWORD' && (!config.keywords || config.keywords.length === 0)) {
        warnings.push('Keyword match comment mode requires at least one comment keyword filter.');
      }
    }
  }

  if (!draft.actions || draft.actions.length === 0) {
    warnings.push('At least one action is required in the execution pipeline.');
  } else {
    draft.actions.forEach((act, idx) => {
      if (act.actionType === 'SEND_MESSAGE' && !act.payload.data.text?.trim()) {
        warnings.push(`Action Step ${idx + 1} (Send Message) text payload is currently empty.`);
      }
      if (act.actionType === 'WAIT' && (act.payload.data.delaySeconds ?? 0) <= 0) {
        warnings.push(`Action Step ${idx + 1} (Wait Timer) delay must be greater than 0.`);
      }
    });
  }

  const isValid = warnings.length === 0;

  useEffect(() => {
    onValidationChange(isValid, warnings);
  }, [isValid, warnings.join('|')]);

  const triggerMeta = draft.trigger.type ? TRIGGER_REGISTRY[draft.trigger.type] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          Step 5: Review & Save
        </Title>
        <Text type="secondary">
          Review your configured settings before activating.
        </Text>
      </div>

      {/* Validation Status */}
      {isValid ? (
        <Alert
          message="Validation Successful"
          description="Your automation flow configuration is valid. You can save and exit."
          type="success"
          showIcon
          icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
        />
      ) : (
        <Alert
          message="Configuration Errors Found"
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined style={{ color: '#ef4444' }} />}
          description={
            <List
              size="small"
              dataSource={warnings}
              renderItem={(item) => (
                <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                  <Text type="danger">• {item}</Text>
                </List.Item>
              )}
            />
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Flow Information" style={{ borderRadius: '12px', height: '100%' }}>
            <Descriptions column={1} layout="vertical">
              <Descriptions.Item label={<Text strong>Automation Name</Text>}>
                {draft.metadata.name || <Text type="danger">Not specified</Text>}
              </Descriptions.Item>
              <Descriptions.Item label={<Text strong>Instagram Scope Account</Text>}>
                <Space>
                  <InstagramOutlined style={{ color: '#4f46e5' }} />
                  {activeAccountName || 'Unknown / Default'}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Trigger Configuration" style={{ borderRadius: '12px', height: '105%' }}>
            {triggerMeta ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {triggerMeta.icon}
                  <Text strong style={{ fontSize: '15px' }}>{triggerMeta.title}</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                
                {draft.trigger.type === 'DIRECT_MESSAGE' && (
                  <div>
                    <Text type="secondary">Mode: </Text>
                    <Tag color="cyan">{draft.trigger.config?.mode || 'ANY_MESSAGE'}</Tag>
                    {draft.trigger.config?.mode === 'KEYWORD' && (
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary">Keywords: </Text>
                        {(draft.trigger.config?.keywords || []).map((kw: string) => (
                          <Tag key={kw} color="indigo">{kw}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(draft.trigger.type === 'REEL_COMMENT' || draft.trigger.type === 'POST_COMMENT') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <Text type="secondary">Media Targeting: </Text>
                      <Tag color="cyan">{draft.trigger.config?.mediaScope || 'ALL'}</Tag>
                    </div>
                    {draft.trigger.config?.mediaId && (
                      <div>
                        <Text type="secondary">Asset ID: </Text>
                        <Text code>{draft.trigger.config.mediaId}</Text>
                      </div>
                    )}
                    <div>
                      <Text type="secondary">Comment Matching: </Text>
                      <Tag color="cyan">{draft.trigger.config?.matchType || 'ANY'}</Tag>
                    </div>
                    {draft.trigger.config?.matchType === 'KEYWORD' && (
                      <div>
                        <Text type="secondary">Keywords: </Text>
                        {(draft.trigger.config?.keywords || []).map((kw: string) => (
                          <Tag key={kw} color="indigo">{kw}</Tag>
                        ))}
                      </div>
                    )}
                    {draft.trigger.config?.publicReply && (
                      <div style={{ marginTop: '6px' }}>
                        <Text type="secondary">Public Reply: </Text>
                        <Text italic>"{draft.trigger.config.publicReply}"</Text>
                      </div>
                    )}
                  </div>
                )}

                {draft.trigger.type === 'STORY_REPLY' && (
                  <div>
                    <Text type="secondary">Story Scope: </Text>
                    <Tag color="cyan">{draft.trigger.config?.storyScope || 'ANY'}</Tag>
                  </div>
                )}

                {draft.trigger.type === 'STORY_MENTION' && (
                  <Text type="secondary">Story references tags on publication.</Text>
                )}
              </div>
            ) : (
              <Text type="danger">No trigger chosen</Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Conditions Check Rules" style={{ borderRadius: '12px' }}>
        <List
          size="small"
          dataSource={draft.conditions}
          locale={{ emptyText: 'No conditional filters applied. Auto-executes targets unconditionally.' }}
          renderItem={(cond, index) => (
            <List.Item>
              <Space>
                <Tag color="purple">{cond.field}</Tag>
                <Text code>{cond.operator}</Text>
                <Text strong>"{cond.value}"</Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Card title="Sequenced Execution Actions" style={{ borderRadius: '12px' }}>
        <List
          size="small"
          dataSource={draft.actions}
          locale={{ emptyText: 'No execution actions declared.' }}
          renderItem={(act, index) => {
            const isMsg = act.actionType === 'SEND_MESSAGE';
            return (
              <List.Item>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', width: '100%' }}>
                  <div style={{ marginTop: '4px' }}>
                    {isMsg ? (
                      <MessageOutlined style={{ color: '#3b82f6', fontSize: '18px' }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />
                    )}
                  </div>
                  <div>
                    <Text strong>Step {index + 1}: {isMsg ? 'Send Massage' : 'Wait Timer'}</Text>
                    <div style={{ marginTop: '4px' }}>
                      {isMsg ? (
                        <Text italic>"{act.payload.data.text}"</Text>
                      ) : (
                        <Tag color="orange">{act.payload.data.delaySeconds} seconds</Tag>
                      )}
                    </div>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}
