import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { TRIGGER_REGISTRY } from '../TriggerRegistry';
import { TriggerType } from '../types';

const { Title, Text } = Typography;

interface TriggerSelectionStepProps {
  selectedType: TriggerType | undefined;
  onSelect: (type: TriggerType) => void;
}

export default function TriggerSelectionStep({
  selectedType,
  onSelect,
}: TriggerSelectionStepProps) {
  const triggerList = Object.values(TRIGGER_REGISTRY);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          Step 1: Choose Your Trigger Event
        </Title>
        <Text type="secondary">
          Select what event will kickstart this automation flow.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {triggerList.map((trig) => {
          const isSelected = selectedType === trig.type;
          return (
            <Col xs={24} sm={12} key={trig.type}>
              <Card
                hoverable
                onClick={() => onSelect(trig.type)}
                style={{
                  borderRadius: '16px',
                  border: isSelected ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  background: isSelected ? '#f5f3ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      background: isSelected ? '#eeebff' : '#f1f5f9',
                      padding: '12px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {trig.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <Text strong style={{ fontSize: '16px', color: '#1e293b' }}>
                      {trig.title}
                    </Text>
                    <Text style={{ fontSize: '13px', color: '#64748b' }}>
                      {trig.description}
                    </Text>
                    <Text style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      {trig.explanation}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
