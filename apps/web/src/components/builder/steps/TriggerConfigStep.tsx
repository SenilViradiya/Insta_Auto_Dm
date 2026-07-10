import React from 'react';
import { Card, Typography, Alert } from 'antd';
import { TRIGGER_REGISTRY, RenderTriggerConfig } from '../TriggerRegistry';
import { TriggerType } from '../types';

const { Title, Text } = Typography;

interface TriggerConfigStepProps {
  type: TriggerType;
  config: any;
  onChange: (config: any) => void;
  instagramAccountId: string;
}

export default function TriggerConfigStep({
  type,
  config,
  onChange,
  instagramAccountId,
}: TriggerConfigStepProps) {
  const meta = TRIGGER_REGISTRY[type];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          Step 2: Configure Trigger Rules
        </Title>
        <Text type="secondary">
          Customize parameters for the selected "{meta?.title || type}" trigger.
        </Text>
      </div>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {meta?.icon}
            <span style={{ fontWeight: 'bold' }}>{meta?.title || type} Rules</span>
          </div>
        }
        bordered={false}
        style={{ borderRadius: '16px', border: '1px solid #cbd5e1' }}
      >
        <RenderTriggerConfig
          type={type}
          config={config}
          onChange={onChange}
          instagramAccountId={instagramAccountId}
        />
      </Card>

      {(!instagramAccountId || instagramAccountId === 'default') && (
        <Alert
          message="Account scope missing"
          description="Make sure you select/link an active Instagram account to correctly display media lists."
          type="warning"
          showIcon
        />
      )}
    </div>
  );
}
