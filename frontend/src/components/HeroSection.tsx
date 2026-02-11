'use client';

import React from 'react';

export default function HeroSection() {
  return (
    <div className="hero-section">
      <div className="hero-content">
        <div className="hero-badge">x402 Hackathon 2026</div>
        <h1 className="hero-title">
          <span className="gradient-text">Autonomous</span> <br />
          <span className="gradient-text-accent">AI Agent Economy</span>
        </h1>
        <p className="hero-desc">
          A fully autonomous agent that plans, executes, and <strong>micropays</strong> for services
          on the Stacks blockchain using the x402 protocol.
        </p>
      </div>

      <div className="hero-visual glass-panel">
        {/* Abstract Architecture Diagram using SVG */}
        <svg width="100%" height="100%" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,255,255,0.3)" />
            </marker>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor:'#7c3aed', stopOpacity:1}} />
              <stop offset="100%" style={{stopColor:'#db2777', stopOpacity:1}} />
            </linearGradient>
          </defs>

          {/* User Node */}
          <circle cx="50" cy="150" r="30" fill="rgba(255,255,255,0.05)" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
          <text x="50" y="155" textAnchor="middle" fill="white" fontSize="12" fontFamily="var(--font-sans)">USER</text>

          {/* Agent Node */}
          <rect x="200" y="100" width="120" height="100" rx="10" fill="rgba(124, 58, 237, 0.1)" stroke="url(#grad1)" strokeWidth="2" />
          <text x="260" y="140" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">AI AGENT</text>
          <text x="260" y="160" textAnchor="middle" fill="#a1a1aa" fontSize="10">Groq Planner</text>

          {/* Tool Nodes */}
          <rect x="450" y="50" width="100" height="40" rx="6" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" strokeWidth="1" />
          <text x="500" y="75" textAnchor="middle" fill="#06b6d4" fontSize="11">Weather API</text>

          <rect x="450" y="130" width="100" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="1" />
          <text x="500" y="155" textAnchor="middle" fill="#10b981" fontSize="11">Summarizer</text>

          <rect x="450" y="210" width="100" height="40" rx="6" fill="rgba(245, 158, 11, 0.1)" stroke="#f59e0b" strokeWidth="1" />
          <text x="500" y="235" textAnchor="middle" fill="#f59e0b" fontSize="11">Math Solver</text>

          {/* Connection Lines */}
          {/* User -> Agent */}
          <line x1="80" y1="150" x2="190" y2="150" stroke="rgba(255,255,255,0.3)" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="4" />

          {/* Agent -> Service 1 */}
          <path d="M320 150 C 380 150, 380 70, 440 70" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <circle cx="380" cy="110" r="3" fill="#7c3aed">
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Agent -> Service 2 */}
          <line x1="320" y1="150" x2="440" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />

          {/* Agent -> Service 3 */}
          <path d="M320 150 C 380 150, 380 230, 440 230" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />

          {/* Payment Badges */}
          <rect x="360" y="60" width="40" height="16" rx="4" fill="#1e1e24" stroke="none" />
          <text x="380" y="72" textAnchor="middle" fill="#10b981" fontSize="9">STX</text>

          <rect x="360" y="220" width="40" height="16" rx="4" fill="#1e1e24" stroke="none" />
          <text x="380" y="232" textAnchor="middle" fill="#f59e0b" fontSize="9">sBTC</text>

        </svg>
      </div>

      <style jsx>{`
        .hero-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 40px 0;
          gap: 40px;
        }
        .hero-content {
          flex: 1;
          max-width: 500px;
        }
        .hero-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-primary);
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.2);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          margin-bottom: 20px;
          letter-spacing: 0.05em;
        }
        .hero-title {
          font-size: 3.5rem;
          line-height: 1.1;
          margin-bottom: 24px;
        }
        .hero-desc {
          font-size: 1.1rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .hero-visual {
          flex: 1;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .hero-section {
            flex-direction: column;
            text-align: center;
            padding: 20px 0;
          }
          .hero-visual {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
