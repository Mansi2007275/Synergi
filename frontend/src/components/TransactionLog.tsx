'use client';

import React, { useEffect, useState } from 'react';

interface PaymentLog {
  timestamp: string;
  endpoint: string;
  transaction: string;
  token: 'STX' | 'sBTC';
  amount: string;
  explorerUrl: string;
  payer: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TransactionLog({ refreshTrigger }: { refreshTrigger?: number }) {
  const [payments, setPayments] = useState<PaymentLog[]>([]);

  const fetchPayments = () => {
    fetch(`${API_BASE}/api/payments`)
      .then(res => res.json())
      .then(data => {
        // Reverse to show newest first
        const sorted = (data.payments || []).reverse();
        setPayments(sorted);
      })
      .catch(err => console.error('Failed to load payment logs:', err));
  };

  useEffect(() => {
    fetchPayments();
    // Poll every 5s just in case
    const interval = setInterval(fetchPayments, 5000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  return (
    <div className="tx-log glass-panel">
      <div className="tx-log__header">
        <h3>Live Payments</h3>
        <div className="live-badge">
          <span className="pulsing-dot-green"></span>
          LIVE
        </div>
      </div>

      <div className="tx-list__container">
        {payments.length === 0 ? (
          <div className="tx-empty">
            <p>No transactions yet.</p>
            <p className="sub">Agent is waiting for instructions.</p>
          </div>
        ) : (
          <div className="tx-list">
            {payments.map((tx, i) => (
              <div key={i} className="tx-item">
                <div className="tx-item__row">
                  <span className="tx-endpoint mono">{tx.endpoint.replace('/api/', '')}</span>
                  <span className={`badge ${tx.token === 'sBTC' ? 'badge-sbtc' : 'badge-stx'}`}>
                    {tx.amount}
                  </span>
                </div>
                <div className="tx-item__row sub">
                  <span className="tx-time">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                  <a href={tx.explorerUrl} target="_blank" rel="noreferrer" className="tx-link">
                    View on Explorer ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .tx-log {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 400px;
          overflow: hidden;
        }
        .tx-log__header {
          padding: 16px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tx-log__header h3 {
          font-size: 1rem;
          color: var(--text-primary);
        }
        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--accent-success);
          background: rgba(16, 185, 129, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .pulsing-dot-green {
          width: 6px;
          height: 6px;
          background-color: var(--accent-success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .tx-list__container {
          flex: 1;
          overflow-y: auto;
          padding: 0 8px 8px 16px; /* Space for scrollbar */
        }
        .tx-list {
          display: flex;
          flex-direction: column;
        }
        .tx-item {
          padding: 12px 0;
          border-bottom: 1px solid var(--border-subtle);
          animation: slideIn 0.3s ease-out;
        }
        .tx-item:last-child {
          border-bottom: none;
        }
        .tx-item__row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .tx-item__row.sub {
          margin-bottom: 0;
        }
        .tx-endpoint {
          font-size: 0.85rem;
          color: var(--accent-cyan);
        }
        .tx-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .tx-link {
          font-size: 0.75rem;
          color: var(--text-secondary);
          transition: color 0.2s;
        }
        .tx-link:hover {
          color: var(--accent-primary);
          text-decoration: underline;
        }
        .tx-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-muted);
          padding: 32px;
        }
        .tx-empty p { font-size: 0.9rem; }
        .tx-empty .sub { font-size: 0.8rem; opacity: 0.6; margin-top: 4px; }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
