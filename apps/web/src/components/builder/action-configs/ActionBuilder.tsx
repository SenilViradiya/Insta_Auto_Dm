import React from 'react';
import { Button, Card, Input, InputNumber, Space, Typography, Badge, Tooltip } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  ApiOutlined,
  TagOutlined,
  UserSwitchOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { ActionItem, ActionType } from '../types';

const { Text, Title } = Typography;
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
    if (actionType === 'SEND_MESSAGE') {
      newItem = {
        actionType: 'SEND_MESSAGE',
        payload: {
          version: 1,
          type: 'SEND_MESSAGE',
          data: {
            text: '',
          },
        },
      };
    } else {
      newItem = {
        actionType: 'WAIT',
        payload: {
          version: 1,
          type: 'WAIT',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Text type="secondary">
        Add actions to build the execution pipeline sequentially:
      </Text>

      {/* Pipeline Sequence */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {actions.map((act, index) => {
          const isMsg = act.actionType === 'SEND_MESSAGE';
          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <Card
                style={{ width: '100%', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                styles={{ body: { padding: '16px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <Space>
                    {isMsg ? (
                      <Badge color="blue" text={<Text strong>Step {index + 1}: Send Direct Message</Text>} />
                    ) : (
                      <Badge color="orange" text={<Text strong>Step {index + 1}: Wait Delay</Text>} />
                    )}
                  </Space>
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveAction(index)}
                  />
                </div>

                {isMsg ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>DM Message Text</Text>
                    <TextArea
                      value={act.payload.data.text || ''}
                      onChange={(e) => handleUpdateActionData(index, { text: e.target.value })}
                      placeholder="Write the response message..."
                      rows={3}
                    />
                    {!act.payload.data.text && (
                      <Text type="danger" style={{ fontSize: '11px' }}>
                        Message text is required.
                      </Text>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>Delay Length (Seconds)</Text>
                    <InputNumber
                      value={act.payload.data.delaySeconds || 0}
                      onChange={(val) => handleUpdateActionData(index, { delaySeconds: val || 0 })}
                      min={1}
                      max={86400}
                      style={{ width: '150px' }}
                    />
                  </div>
                )}
              </Card>

              {index < actions.length - 1 && (
                <div style={{ margin: '8px 0', color: '#94a3b8' }}>
                  <ArrowDownOutlined style={{ fontSize: '16px' }} />
                </div>
              )}
            </div>
          );
        })}

        {actions.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
            <Text type="secondary">No actions in the pipeline yet. Add actions below.</Text>
          </div>
        )}
      </div>

      {/* Actions Selector Panel */}
      <Card
        title={<span style={{ fontSize: '14px', fontWeight: 'bold' }}>Add Pipeline Step</span>}
        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => handleAddAction('SEND_MESSAGE')}
            style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
          >
            Send Message
          </Button>

          <Button
            type="default"
            icon={<ClockCircleOutlined />}
            onClick={() => handleAddAction('WAIT')}
          >
            Wait Timer
          </Button>

          {/* Disabled future compatible placeholders */}
          <Tooltip title="AI Responses integration (Coming soon)">
            <Button type="text" disabled icon={<RobotOutlined />}>
              AI Reply
            </Button>
          </Tooltip>

          <Tooltip title="Webhooks dispatching (Coming soon)">
            <Button type="text" disabled icon={<ApiOutlined />}>
              Webhook
            </Button>
          </Tooltip>

          <Tooltip title="Keyword tagging (Coming soon)">
            <Button type="text" disabled icon={<TagOutlined />}>
              Assign Tag
            </Button>
          </Tooltip>

          <Tooltip title="Human handoff CRM support (Coming soon)">
            <Button type="text" disabled icon={<UserSwitchOutlined />}>
              CRM / Handoff
            </Button>
          </Tooltip>
        </div>
      </Card>
    </div>
  );
}
