import React from 'react';
import { TRIGGER_REGISTRY } from '../TriggerRegistry';
import { TriggerType } from '../types';
import { Check } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 var(--space-1) 0' }}>
          Select Trigger Event
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Choose the Instagram action that will automatically kickstart this message flow.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        {triggerList.map((trig) => {
          const isSelected = selectedType === trig.type;
          return (
            <div
              key={trig.type}
              onClick={() => onSelect(trig.type)}
              style={{
                borderRadius: 'var(--radius-lg)',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: 'var(--surface)',
                padding: 'var(--space-5)',
                cursor: 'pointer',
                transition: 'all var(--duration) var(--ease)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
              }}
              className="card-interactive"
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onSelect(trig.type); }}
            >
              {/* Top Row: Icon + Selection Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--hover-bg)' : 'var(--surface-secondary)',
                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--duration) var(--ease)',
                  }}
                >
                  {trig.icon}
                </div>

                {isSelected && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Text details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {trig.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {trig.description}
                </div>
              </div>

              {/* Detailed Technical Scope Tag */}
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--divider)',
                  paddingTop: 'var(--space-3)',
                  marginTop: 'var(--space-1)',
                  lineHeight: 1.4,
                }}
              >
                {trig.explanation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
