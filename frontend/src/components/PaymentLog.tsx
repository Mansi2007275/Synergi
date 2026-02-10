'use client';

import { useEffect, useState, useCallback } from 'react';

interface Payment {
  endpoint: string;
  amount: string;
  token: string;
  payer: string;
  transaction: string;
  network: string;
  explorerUrl: string;
  timestamp: string;
}

interface PaymentLogProps {
  apiBase: string;
  refreshTrigger?: number;
}

export default function PaymentLog({ apiBase, refreshTrigger }: PaymentLogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(() => {
    fetch(`${apiBase}/api/payments`)
      .then((res) => res.json())
      .then((data) => {
        setPayments(data.payments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiBase]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments, refreshTrigger]);

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <span className="icon">&#128176;</span> Payment History
        </h3>
        <span className="badge badge-network">{payments.length} txns</span>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="loading-bar" />
          Loading payments...
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#128203;</div>
          <p>No payments yet. Send a query to trigger a micropayment.</p>
        </div>
      ) : (
        <div className="payment-list">
          {[...payments].reverse().map((p, i) => (
            <div key={i} className="payment-item">
              <div>
                <div className="payment-endpoint">{p.endpoint}</div>
                <div className="payment-time">{formatTime(p.timestamp)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="cost-badge" style={{ marginBottom: 4 }}>
                  {p.amount} {p.token}
                </div>
                <a
                  href={p.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="payment-tx"
                >
                  {p.transaction.slice(0, 10)}... &#8599;
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
