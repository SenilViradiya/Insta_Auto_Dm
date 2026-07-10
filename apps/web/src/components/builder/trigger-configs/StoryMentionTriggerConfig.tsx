import React from 'react';
import { Alert, Typography } from 'antd';

const { Text } = Typography;

interface StoryMentionTriggerConfigProps {
  config: any;
  onChange: (config: any) => void;
}

export default function StoryMentionTriggerConfig({
  config,
  onChange,
}: StoryMentionTriggerConfigProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <Text strong style={{ display: 'block', marginBottom: '4px' }}>
          Story Mention Info
        </Text>
        <Text type="secondary">
          No extra settings required for Story Mentions.
        </Text>
      </div>
      <Alert
        message="Story Mention Trigger Info"
        description="The flow will run instantly as soon as someone publishes a story mentioning your linked Instagram handle."
        type="info"
        showIcon
      />
    </div>
  );
}
