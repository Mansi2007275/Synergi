'use client';

import React, { useState } from 'react';
import HeroSection from '@/components/HeroSection';
import AgentChat from '@/components/AgentChat';
import TransactionLog from '@/components/TransactionLog';
import ToolCatalog from '@/components/ToolCatalog';
import WalletInfo from '@/components/WalletInfo';

export default function Home() {
  const [refreshLogTrigger, setRefreshLogTrigger] = useState(0);

  const handleNewPayments = () => {
    // Increment trigger to refresh logs when agent finishes
    setRefreshLogTrigger(prev => prev + 1);
  };

  return (
    <main className="main-container">
      {/* Navbar / Header area */}
      <header className="header">
        <div className="brand">
          <div className="logo-icon" />
          <span className="logo-text mono">x402.agent</span>
        </div>
        <WalletInfo />
      </header>

      <div className="content">
        <HeroSection />

        <div className="dashboard-grid">
          {/* Left Column: Agent Chat */}
          <div className="col-chat glass-panel">
            <AgentChat onNewPayments={handleNewPayments} />
          </div>

          {/* Right Column: Transaction Log */}
          <div className="col-logs">
            <TransactionLog refreshTrigger={refreshLogTrigger} />

            {/* Promo / Info Card */}
            <div className="info-card glass-panel">
              <h4>Hackathon Mode</h4>
              <p>
                This agent uses <strong>Groq</strong> for planning and <strong>Stacks</strong> for payments.
                Everything is running live on testnet.
              </p>
            </div>
          </div>
        </div>

        <ToolCatalog />
      </div>

      <footer className="footer">
        <p>© 2026 x402 Stacks Hackathon Team</p>
      </footer>

      <style jsx>{`
        .main-container {
          min-height: 100vh;
          padding: 0 40px 40px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 8px;
        }
        .logo-text {
          font-weight: 700;
          font-size: 1.2rem;
          color: var(--text-primary);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 24px;
          margin-top: 20px;
        }
        .col-chat {
          height: 600px; /* Fixed height for chat area */
          padding: 20px;
          display: flex;
          flex-direction: column;
        }
        .col-logs {
          display: flex;
          flex-direction: column;
          gap: 24px;
          height: 600px;
        }
        .info-card {
          padding: 24px;
        }
        .info-card h4 {
          margin-bottom: 8px;
          color: var(--accent-warning);
        }
        .info-card p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .footer {
          margin-top: 60px;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .col-chat, .col-logs {
            height: auto;
            min-height: 500px;
          }
        }
      `}</style>
    </main>
  );
}
