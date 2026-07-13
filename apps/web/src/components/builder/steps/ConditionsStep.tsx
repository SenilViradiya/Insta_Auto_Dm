import React from 'react';
import ConditionBuilder from '../condition-configs/ConditionBuilder';
import { Condition } from '../types';

interface ConditionsStepProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export default function ConditionsStep({
  conditions,
  onChange,
}: ConditionsStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 var(--space-1) 0' }}>
          Define Filter Conditions
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Set up filtering constraints. The execution pipeline runs only if all conditions validate to true.
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
        <ConditionBuilder conditions={conditions} onChange={onChange} />
      </div>
    </div>
  );
}
