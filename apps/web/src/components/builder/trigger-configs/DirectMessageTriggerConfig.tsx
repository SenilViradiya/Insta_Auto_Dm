import React, { useState, useEffect } from 'react';
import { Radio, Input, Space, Button, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DirectMessageTriggerConfigProps {
  config: any;
  onChange: (config: any) => void;
}

export default function DirectMessageTriggerConfig({
  config,
  onChange,
}: DirectMessageTriggerConfigProps) {
  const mode = config?.mode || 'ANY_MESSAGE';
  const keywords: string[] = config?.keywords || [];

  const [inputVal, setInputVal] = useState('');

  const handleModeChange = (newMode: string) => {
    if (newMode === 'ANY_MESSAGE') {
      onChange({ mode: 'ANY_MESSAGE' });
    } else {
      onChange({ mode: 'KEYWORD', keywords: keywords.length > 0 ? keywords : [] });
    }
  };

  const handleAddKeyword = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      const updated = [...keywords, trimmed];
      onChange({ mode: 'KEYWORD', keywords: updated });
      setInputVal('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    const updated = keywords.filter((kw) => kw !== kwToRemove);
    onChange({ mode: 'KEYWORD', keywords: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
          Direct Message Mode
        </Text>
        <Radio.Group
          value={mode}
          onChange={(e) => handleModeChange(e.target.value)}
          size="large"
        >
          <Radio.Button value="ANY_MESSAGE">Any Message</Radio.Button>
          <Radio.Button value="KEYWORD">Keyword Match</Radio.Button>
        </Radio.Group>
      </div>

      {mode === 'KEYWORD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Text type="secondary">
            Provide the keywords that will trigger this automation flow:
          </Text>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. price, promo, info"
              onPressEnter={handleAddKeyword}
              style={{ maxWidth: '300px' }}
            />
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddKeyword}
            >
              Add
            </Button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {keywords.map((kw) => (
              <Tag
                key={kw}
                closable
                onClose={() => handleRemoveKeyword(kw)}
                color="indigo"
                style={{ fontSize: '14px', padding: '4px 8px' }}
              >
                {kw}
              </Tag>
            ))}
            {keywords.length === 0 && (
              <Text type="warning" style={{ fontSize: '12px' }}>
                Please add at least one keyword to trigger the flow.
              </Text>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
