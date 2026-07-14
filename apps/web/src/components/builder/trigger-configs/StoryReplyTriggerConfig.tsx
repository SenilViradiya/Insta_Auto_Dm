import React from 'react';
import { Radio } from 'antd';
import { Info } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Story Scope
        </label>
        <Radio.Group value={storyScope} onChange={(e) => handleChange(e.target.value)} size="middle">
          <Radio.Button value="ANY">Any Active Story</Radio.Button>
          <Radio.Button value="SPECIFIC" disabled>Specific Story (Coming Soon)</Radio.Button>
        </Radio.Group>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-5)',
          background: 'var(--hover-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--primary)',
        }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          This automation flow triggers whenever any Instagram user replies to any of your active published stories.
        </span>
      </div>
    </div>
  );
}
