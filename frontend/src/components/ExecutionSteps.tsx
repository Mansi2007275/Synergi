'use client';

import React from 'react';

interface StepData {
  label: string;
  detail?: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

export default function ExecutionSteps({ steps }: { steps: StepData[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="steps-container">
      {steps.map((step, i) => (
        <div key={i} className={`step step--${step.status}`}>
          <div className="step-icon">
            {step.status === 'complete' && (
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                 <polyline points="20 6 9 17 4 12" />
               </svg>
            )}
            {step.status === 'error' && (
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                 <line x1="18" y1="6" x2="6" y2="18" />
                 <line x1="6" y1="6" x2="18" y2="18" />
               </svg>
            )}
            {step.status === 'active' && <div className="step-spinner" />}
            {step.status === 'pending' && <div className="step-dot" />}
          </div>
          <div className="step-content">
            <div className="step-label">{step.label}</div>
            {step.detail && <div className="step-detail">{step.detail}</div>}
          </div>
        </div>
      ))}

      <style jsx>{`
        .steps-container {
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 80%;
          align-self: flex-start; /* Aligns with agent bubbles */
        }
        .step {
          display: flex;
          gap: 12px;
          opacity: 0.6;
          transition: opacity 0.3s;
        }
        .step--active, .step--complete, .step--error {
          opacity: 1;
        }
        .step-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          margin-top: 2px;
        }
        .step--complete .step-icon {
          background: rgba(16, 185, 129, 0.2);
          border-color: var(--accent-success);
          color: var(--accent-success);
        }
        .step--error .step-icon {
          background: rgba(239, 68, 68, 0.2);
          border-color: var(--accent-error);
          color: var(--accent-error);
        }
        .step--active .step-icon {
          border-color: var(--accent-primary);
        }

        .step-content {
          flex: 1;
        }
        .step-label {
          font-size: 0.85rem;
          color: var(--text-primary);
          font-weight: 500;
        }
        .step-detail {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .step-spinner {
          width: 10px;
          height: 10px;
          border: 2px solid var(--accent-primary);
          border-right-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .step-dot {
          width: 6px;
          height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
