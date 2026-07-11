import React from 'react';
import { Card, Typography } from 'antd';
import ActionBuilder from '../action-configs/ActionBuilder';
import { ActionItem } from '../types';

const { Title, Text } = Typography;

interface ActionsStepProps {
  actions: ActionItem[];
  onChange: (actions: ActionItem[]) => void;
}

export default function ActionsStep({
  actions,
  onChange,
}: ActionsStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          Step 4: Configure Execution Actions
        </Title>
        <Text type="secondary">
          Define the message contents and delays in order of execution.
        </Text>
      </div>

      <Card
        title={<span style={{ fontWeight: 'bold' }}>Actions Pipeline</span>}
        variant="borderless"
        style={{ borderRadius: '16px', border: '1px solid #cbd5e1' }}
      >
        <ActionBuilder actions={actions} onChange={onChange} />
      </Card>
    </div>
  );
}
