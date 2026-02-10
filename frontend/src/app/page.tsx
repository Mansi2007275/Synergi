'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import QueryPanel from '@/components/QueryPanel';
import ResultsCard from '@/components/ResultsCard';
import ToolCatalog from '@/components/ToolCatalog';
import PaymentLog from '@/components/PaymentLog';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AgentResult {
  query: string;
  plan: {
    query: string;
    toolCalls: { toolId: string; params: Record<string, unknown> }[];
    reasoning: string;
  };
  results: {
    tool: string;
    success: boolean;
    data: Record<string, unknown> | null;
    payment?: {
      transaction: string;
      token: string;
      amount: string;
      explorerUrl: string;
    };
    error?: string;
  }[];
  finalAnswer: string;
  totalCost: number;
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AgentResult[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, token: 'STX' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Server responded with ${res.status}`);
      }

      const data: AgentResult = await res.json();
      setResults((prev) => [data, ...prev]);
      setRefreshTrigger((n) => n + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header network="testnet" />

      <main className="app-container">
        <section className="hero">
          <h1>
            Autonomous <span className="gradient-text">Micropayments</span>
          </h1>
          <p>
            An AI agent that discovers tools, plans calls, and pays for each one
            automatically via x402 on the Stacks blockchain.
          </p>
        </section>

        <QueryPanel onSubmit={handleQuery} isLoading={isLoading} />

        {isLoading && (
          <div className="card" style={{ marginBottom: 32, textAlign: 'center', padding: 32 }}>
            <span className="loading-spinner" />
            <span style={{ color: 'var(--text-secondary)' }}>
              Planning tools, signing payment, settling on-chain...
            </span>
            <div className="loading-bar" />
          </div>
        )}

        {error && (
          <div
            className="card"
            style={{
              marginBottom: 32,
              borderLeft: '3px solid var(--accent-red)',
              color: 'var(--accent-red)',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {results.map((result, i) => (
          <ResultsCard key={i} result={result} />
        ))}

        <section className="dashboard-grid">
          <ToolCatalog apiBase={API_BASE} />
          <PaymentLog apiBase={API_BASE} refreshTrigger={refreshTrigger} />
        </section>
      </main>

      <footer className="footer">
        Built with{' '}
        <a href="https://github.com/stacks-network/x402-stacks" target="_blank" rel="noopener noreferrer">
          x402-stacks
        </a>{' '}
        for the Stacks x402 Hackathon
      </footer>
    </>
  );
}
