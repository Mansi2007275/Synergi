'use client';

import React, { useState } from 'react';

interface ProtocolTraceEntry {
  step: string;
  httpStatus: number;
  headers: Record<string, string>;
  timestamp: number;
  paymentPayload?: string;
}

interface HiringDecision {
  tool: string;
  selectedAgent: string;
  reason: string;
  valueScore: number;
  alternatives: { id: string; score: number }[];
  approved: boolean;
}

interface Props {
  traces: ProtocolTraceEntry[];
  hiringDecisions: HiringDecision[];
}

export default function ProtocolTrace({ traces, hiringDecisions }: Props) {
  const [tab, setTab] = useState<'protocol' | 'hiring'>('protocol');

  return (
    <div className="glass-panel" style={{ height: '100%', padding: 14, display: 'flex', flexDirection: 'column' }}>
      {/* Header with tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            { key: 'protocol', label: 'x402 PROTOCOL', count: traces.length },
            { key: 'hiring', label: 'HIRING LOG', count: hiringDecisions.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '3px 10px', fontSize: '0.6rem', fontWeight: 700,
                borderRadius: 6, border: '1px solid',
                borderColor: tab === t.key ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                background: tab === t.key ? 'rgba(6,182,212,0.1)' : 'transparent',
                color: tab === t.key ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s',
                letterSpacing: '0.03em',
              }}
            >
              {t.label} {t.count > 0 && <span style={{ opacity: 0.6 }}>({t.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'protocol' ? (
          traces.length === 0 ? (
            <EmptyState text="No protocol traces yet. Send a query to see raw x402 handshake data." />
          ) : (
            traces.map((trace, i) => <TraceCard key={i} trace={trace} index={i} />)
          )
        ) : (
          hiringDecisions.length === 0 ? (
            <EmptyState text="No hiring decisions yet. The Manager Agent will show autonomous cost-evaluation logic here." />
          ) : (
            hiringDecisions.map((decision, i) => <HiringCard key={i} decision={decision} />)
          )
        )}
      </div>
    </div>
  );
}

function TraceCard({ trace, index }: { trace: ProtocolTraceEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = trace.httpStatus === 402 ? '#f59e0b' : trace.httpStatus === 200 ? '#10b981' : '#ef4444';

  return (
    <div
      style={{
        padding: '8px 10px', marginBottom: 4,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 6, border: '1px solid var(--border-subtle)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: '0.55rem', fontWeight: 700,
          color: statusColor,
          fontFamily: 'var(--font-mono)',
          background: `${statusColor}15`,
          padding: '1px 6px', borderRadius: 4,
        }}>
          {trace.httpStatus}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, flex: 1 }}>
          {trace.step}
        </span>
        <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {new Date(trace.timestamp).toLocaleTimeString()}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
          {expanded ? '▾' : '▸'}
        </span>
      </div>

      {/* Expanded: headers */}
      {expanded && (
        <div style={{
          marginTop: 8, padding: 8,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 6, fontFamily: 'var(--font-mono)',
          fontSize: '0.55rem', color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: 4 }}>
            Response Headers:
          </div>
          {Object.entries(trace.headers || {}).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: '#10b981' }}>{k}:</span>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>{typeof v === 'string' ? v.slice(0, 120) : JSON.stringify(v).slice(0, 120)}</span>
            </div>
          ))}
          {trace.paymentPayload && (
            <>
              <div style={{ color: '#f59e0b', fontWeight: 700, marginTop: 8, marginBottom: 4 }}>
                x402 Payment Payload:
              </div>
              <pre style={{
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                overflowX: 'auto',
                padding: 8,
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 4,
                margin: 0
              }}>
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(trace.paymentPayload), null, 2);
                  } catch (e) {
                    return trace.paymentPayload;
                  }
                })()}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HiringCard({ decision }: { decision: HiringDecision }) {
  return (
    <div style={{
      padding: '8px 10px', marginBottom: 4,
      background: decision.approved ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
      borderRadius: 6,
      border: `1px solid ${decision.approved ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {decision.tool}
          </span>
          <span style={{
            fontSize: '0.5rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4,
            background: decision.approved ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: decision.approved ? '#10b981' : '#ef4444',
          }}>
            {decision.approved ? 'HIRED' : 'REJECTED'}
          </span>
        </div>
        <span style={{
          fontSize: '0.55rem', color: 'var(--accent-cyan)',
          fontFamily: 'var(--font-mono)', fontWeight: 700,
        }}>
          score: {decision.valueScore?.toFixed(1)}
        </span>
      </div>

      <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 4 }}>
        → <strong style={{ color: 'var(--text-secondary)' }}>{decision.selectedAgent}</strong> — {decision.reason}
      </div>

      {decision.alternatives?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, fontSize: '0.5rem', color: 'var(--text-muted)' }}>
          <span>Alternatives:</span>
          {decision.alternatives.slice(0, 3).map((alt, i) => (
            <span key={i} style={{ fontFamily: 'var(--font-mono)' }}>
              {alt.id}({alt.score?.toFixed(1)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: 20, textAlign: 'center',
      color: 'var(--text-muted)', fontSize: '0.65rem',
      lineHeight: 1.5,
    }}>
      {text}
    </div>
  );
}
