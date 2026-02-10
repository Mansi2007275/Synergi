'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import QueryPanel from '@/components/QueryPanel';
import ResultsCard from '@/components/ResultsCard';
import ToolCatalog from '@/components/ToolCatalog';
import PaymentLog from '@/components/PaymentLog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSubmit = async (userQuery: string) => {
    setQuery(userQuery);
    setLoading(true);
    setError(null);
    setResult(null);
    setStatusSteps(['Analyzing intent...']);

    try {
      // Simulate step-by-step progress for better UX
      const timers = [
        setTimeout(() => setStatusSteps(prev => [...prev, 'Planning agent execution path...']), 800),
        setTimeout(() => setStatusSteps(prev => [...prev, 'Orchestrating cross-tool payments...']), 1800),
        setTimeout(() => setStatusSteps(prev => [...prev, 'Executing tools and finalizing response...']), 2800)
      ];

      const response = await fetch(`${API_URL}/api/agent/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Clear timers and set result
      timers.forEach(clearTimeout);

      // Ensure we stay in "Executing" for a brief moment for visual weight
      setTimeout(() => {
        setResult(data);
        setLoading(false);
        setStatusSteps([]);
        setRefreshTrigger(prev => prev + 1); // Trigger logs refresh
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
      setStatusSteps([]);
    }
  };

  return (
    <main className="dashboard-container">
      <Header />

      <div className="dashboard-main">
        <section className="hero-section">
          <h1>Autonomous Agent Dashboard</h1>
          <p>Orchestrating value in the Stacks Economy via x402 Micropayments.</p>
        </section>

        {/* --- How It Works --- */}
        <div className="info-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            How it Works
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>
            Enter a natural language request. Our agent determines which specialized tools are needed,
            <strong> autonomously authorizes x402 micropayments</strong>, and aggregates the results—all
            without you ever needing to sign individual transactions.
          </p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-column">
            <QueryPanel onSubmit={handleSubmit} isLoading={loading} />

            {loading && (
              <div className="card loading-card" style={{ marginTop: '1rem', padding: '2rem' }}>
                <div className="spinner"></div>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Processing Request...</p>
                  <div className="status-steps">
                    {statusSteps.map((step, i) => (
                      <div key={i} className={`status-step ${i === statusSteps.length - 1 ? 'active' : 'completed'}`}>
                        <div className="dot"></div>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="card error-card" style={{ marginTop: '1rem' }}>
                <p><strong>Error:</strong> {error}</p>
              </div>
            )}

            {result && <ResultsCard result={result} />}
          </div>

          <div className="dashboard-column">
            <ToolCatalog apiBase={API_URL} />
            <PaymentLog apiBase={API_URL} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </main>
  );
}
