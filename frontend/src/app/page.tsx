'use client';

import React, { useState } from 'react';
import EconomyGraph from '@/components/EconomyGraph';
import AgentChat from '@/components/AgentChat';
import TransactionLog from '@/components/TransactionLog';
import ToolCatalog from '@/components/ToolCatalog';
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
    <>
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
    </>
  );
}
