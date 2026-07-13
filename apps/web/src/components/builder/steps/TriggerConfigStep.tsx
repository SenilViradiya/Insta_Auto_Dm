import React from 'react';
import { TRIGGER_REGISTRY, RenderTriggerConfig } from '../TriggerRegistry';
import { TriggerType } from '../types';
import { AlertTriangle } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 var(--space-1) 0' }}>
          Configure Trigger Settings
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Customize target scopes and filters for the "<strong>{meta?.title || type}</strong>" event.
        </p>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--divider)', paddingBottom: 'var(--space-4)' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'var(--hover-bg)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {meta?.icon}
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {meta?.title || type} Rules
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Configure scope restrictions below
            </span>
          </div>
        </div>

        <RenderTriggerConfig
          type={type}
          config={config}
          onChange={onChange}
          instagramAccountId={instagramAccountId}
        />
      </div>

      {(!instagramAccountId || instagramAccountId === 'default') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            padding: 'var(--space-4) var(--space-5)',
            background: 'var(--warning-bg)',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-md)',
            color: 'var(--warning)',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Account Scope Missing</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Please link or select an active Instagram account to load and map assets (Reels or Posts) correctly.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
