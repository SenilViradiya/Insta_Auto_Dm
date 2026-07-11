import React from 'react';
import { Card, Typography } from 'antd';
import ConditionBuilder from '../condition-configs/ConditionBuilder';
import { Condition } from '../types';

const { Title, Text } = Typography;

interface ConditionsStepProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export default function ConditionsStep({
  conditions,
  onChange,
}: ConditionsStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          Step 3: Define Filter Conditions
        </Title>
        <Text type="secondary">
          Set up filtering constraints. The execution pipeline runs only if conditions validate to true.
        </Text>
      </div>

      <Card
        title={<span style={{ fontWeight: 'bold' }}>Conditional Rules</span>}
        bordered={false}
        style={{ borderRadius: '16px', border: '1px solid #cbd5e1' }}
      >
        <ConditionBuilder conditions={conditions} onChange={onChange} />
      </Card>
    </div>
  );
}
