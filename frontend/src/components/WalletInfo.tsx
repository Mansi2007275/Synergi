'use client';

import React from 'react';

const AGENT_ADDRESS = process.env.NEXT_PUBLIC_SERVER_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const NETWORK = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet';

export default function WalletInfo() {
  const shortAddress = `${AGENT_ADDRESS.slice(0, 6)}...${AGENT_ADDRESS.slice(-4)}`;

  return (
    <div className="wallet-info glass-panel">
      <div className="wallet-info__status">
        <span className="pulsing-dot"></span>
        <span className="network-name">{NETWORK}</span>
      </div>
      <div className="wallet-info__address mono" title={AGENT_ADDRESS}>
        {shortAddress}
        <button
          className="copy-btn"
          onClick={() => navigator.clipboard.writeText(AGENT_ADDRESS)}
          title="Copy Address"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .wallet-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          height: 40px;
        }
        .wallet-info__status {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pulsing-dot {
          width: 8px;
          height: 8px;
          background-color: var(--accent-success);
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 2s infinite;
        }
        .network-name {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }
        .wallet-info__address {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-primary);
          padding-left: 12px;
          border-left: 1px solid var(--border-subtle);
        }
        .copy-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .copy-btn:hover {
          color: var(--accent-primary);
        }

        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>
    </div>
  );
}
