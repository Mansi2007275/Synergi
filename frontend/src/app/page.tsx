'use client';

import React, { useState } from 'react';
import EconomyGraph from '@/components/EconomyGraph';
import AgentChat from '@/components/AgentChat';
import TransactionLog from '@/components/TransactionLog';
import ToolCatalog from '@/components/ToolCatalog';
import WalletInfo from '@/components/WalletInfo';
import ProtocolTrace from '@/components/ProtocolTrace';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [protocolData, setProtocolData] = useState<any[]>([]);
  const [hiringDecisions, setHiringDecisions] = useState<any[]>([]);

  const handleNewPayments = () => setRefreshTrigger(prev => prev + 1);

  const handleProtocolTrace = (log: any) => {
    if (log.type === 'hiring_decision') {
      setHiringDecisions(prev => [...prev, log]);
    } else {
      setProtocolData(prev => [...prev, log]);
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '0 32px 40px', maxWidth: 1440, margin: '0 auto' }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 0', borderBottom: '2px solid var(--border-strong)', marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src="/logo.png"
            alt="SYNERGI Logo"
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-sm)',
              boxShadow: '4px 4px 0 0 #000',
              border: '1px solid var(--border-strong)'
            }}
          />
          <div>
            <div className="mono" style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              SYNERGI <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', verticalAlign: 'middle' }}>v2.0</span>
            </div>
            <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              x402 AUTONOMOUS AGENT ECONOMY
            </div>
          </div>
        </div>
        <WalletInfo />
      </header>

      {/* ── Economy Graph ── */}
      <div style={{ marginBottom: 32, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
        <EconomyGraph />
      </div>

      {/* ── Main Grid: Chat + Sidebar ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
        gap: 24,
      }}>
        {/* Left: Agent Chat */}
        <div className="glass-panel" style={{ height: 720, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <AgentChat
            onNewPayments={handleNewPayments}
            onProtocolTrace={handleProtocolTrace}
          />
        </div>

        {/* Right: Transaction Log + Protocol Trace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: 720 }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TransactionLog refreshTrigger={refreshTrigger} />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ProtocolTrace traces={protocolData} hiringDecisions={hiringDecisions} />
          </div>
        </div>
      </div>

      {/* ── Tool Catalog ── */}
      <ToolCatalog />

      {/* ── Footer ── */}
      <footer style={{
        marginTop: 64, paddingTop: 24, borderTop: '2px solid var(--border-strong)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          SYNERGI v2.0 — x402 Stacks Hackathon 2026
        </div>
        <div className="mono" style={{ display: 'flex', gap: 24, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>Protocol: x402</span>
          <span>Network: Stacks Testnet</span>
          <span>Settlement: STX / sBTC</span>
        </div>
      </footer>
    </main>
  );
}
