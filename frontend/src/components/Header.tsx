'use client';

import React from 'react';

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">x</div>
          <div className="header-title">
            <span>x402</span> Agent
          </div>
        </div>

        <div className="header-status">
          <div className="status-badge" data-tooltip="The Stacks testnet is used for safe experimentation.">
            <span className="dot"></span>
            Stacks Testnet
          </div>
          <div className="wallet-pill" data-tooltip="This is the autonomous agent's operational wallet.">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            ST1PQ...GZGM
          </div>
        </div>
      </div>
    </header>
  );
}
