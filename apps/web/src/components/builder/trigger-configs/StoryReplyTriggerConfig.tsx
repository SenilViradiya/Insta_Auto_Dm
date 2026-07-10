import React from 'react';
import { Select, Typography, Alert } from 'antd';

const { Text } = Typography;

interface StoryReplyTriggerConfigProps {
  config: any;
  onChange: (config: any) => void;
}

export default function StoryReplyTriggerConfig({
  config,
  onChange,
}: StoryReplyTriggerConfigProps) {
  const storyScope = config?.storyScope || 'ANY';

  const handleChange = (val: string) => {
    onChange({ storyScope: val });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
          Select Story Scope
        </Text>
        <Select
          value={storyScope}
          onChange={handleChange}
          style={{ width: '100%', maxWidth: '300px' }}
          size="large"
        >
          <Select.Option value="ANY">Any Active Story</Select.Option>
          <Select.Option value="SPECIFIC" disabled>
            Specific Story (Coming Soon)
          </Select.Option>
        </Select>
      </div>
      <Alert
        message="Story Reply Trigger Info"
        description="This automation flow triggers whenever any Instagram user replies to any of your active published stories."
        type="info"
        showIcon
      />
    </div>
  );
}
