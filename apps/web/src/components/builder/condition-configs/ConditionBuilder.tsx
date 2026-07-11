import React from 'react';
import { Button, Row, Col, Select, Input, Typography, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Condition } from '../types';

const { Text } = Typography;

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

const FIELD_OPTIONS = [
  { label: 'Message Content Text', value: 'content.text' },
  { label: 'Sender Username', value: 'sender.username' },
];

const OPERATOR_OPTIONS = [
  { label: 'Equals', value: 'EQUALS' },
  { label: 'Contains', value: 'CONTAINS' },
  { label: 'Starts With', value: 'STARTS_WITH' },
  { label: 'Ends With', value: 'ENDS_WITH' },
  { label: 'Matches Regex', value: 'REGEX' },
];

export default function ConditionBuilder({
  conditions = [],
  onChange,
}: ConditionBuilderProps) {
  const handleAddCondition = () => {
    const newCond: Condition = {
      field: 'content.text',
      operator: 'CONTAINS',
      value: '',
    };
    onChange([...conditions, newCond]);
  };

  const handleRemoveCondition = (index: number) => {
    const updated = conditions.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleUpdateCondition = (index: number, updates: Partial<Condition>) => {
    const updated = conditions.map((cond, idx) => {
      if (idx === index) {
        return { ...cond, ...updates };
      }
      return cond;
    });
    onChange(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <Text style={{ display: 'block', marginBottom: '8px' }}>
          Define conditions under which the action pipeline will run. (Optional)
        </Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {conditions.map((cond, index) => (
          <Row key={index} gutter={12} align="middle" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Col xs={24} sm={7}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>Field</Text>
                <Select
                  value={cond.field}
                  onChange={(val) => handleUpdateCondition(index, { field: val })}
                  options={FIELD_OPTIONS}
                  style={{ width: '100%' }}
                />
              </div>
            </Col>

            <Col xs={24} sm={6}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>Operator</Text>
                <Select
                  value={cond.operator}
                  onChange={(val) => handleUpdateCondition(index, { operator: val as any })}
                  options={OPERATOR_OPTIONS}
                  style={{ width: '105%' }}
                />
              </div>
            </Col>

            <Col xs={24} sm={8}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>Matching Value</Text>
                <Input
                  value={cond.value}
                  onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                  placeholder="e.g. query value"
                />
              </div>
            </Col>

            <Col xs={24} sm={3} style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveCondition(index)}
              />
            </Col>
          </Row>
        ))}

        {conditions.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
            <Text type="secondary">No filter conditions linked. Flow executes for every trigger occurrence.</Text>
          </div>
        )}
      </div>

      <Space>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddCondition}
        >
          Add Condition Rule
        </Button>
      </Space>
    </div>
  );
}
