'use client';

import React from 'react';

interface ToolCallResult {
  tool: string;
  result: any;
  payment?: {
    transaction: string;
    token: string;
    amount: string;
    explorerUrl: string;
  };
  error?: string;
}

interface AgentResult {
  query: string;
  plan: string[];
  results: ToolCallResult[];
  finalAnswer: string;
  totalCost: {
    STX: number;
    sBTC_sats: number;
  };
}

interface ResultsCardProps {
  result: AgentResult;
}

export default function ResultsCard({ result }: ResultsCardProps) {
  return (
    <div className="card results-card" style={{ marginTop: '1rem' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span className="icon">&#10003;</span> Result & Insights
        </h3>
        <div className="cost-summary">
          <span className="cost-badge" data-tooltip="Total STX spent on this query.">
            {result.totalCost.STX} STX
          </span>
          <span className="cost-badge" data-tooltip="Total sBTC spent (in satoshis).">
            {result.totalCost.sBTC_sats} sats
          </span>
        </div>
      </div>

      <div className="result-answer">{result.finalAnswer}</div>

      <div className="result-plan">
        <strong>Execution Path:</strong>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
          {result.plan.map((step, i) => (
            <li key={i} style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '4px' }}>
              {step}
            </li>
          ))}
        </ul>
      </div>

      <div className="result-tools">
        {result.results.map((r, i) => (
          <div key={i} className="result-tool-item">
            <div style={{ flex: 1 }}>
              <div className="result-tool-name">
                {r.error ? '✗' : '✓'} {r.tool}
              </div>
              <div className="result-tool-data">
                {r.error ? r.error : String(r.result)}
              </div>
            </div>
            {r.payment && (
              <div className="result-tool-payment">
                <div className="cost-badge" style={{ marginBottom: 6 }}>
                  {r.payment.amount}
                </div>
                <a
                  href={r.payment.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="payment-tx"
                >
                  View tx &#8599;
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
