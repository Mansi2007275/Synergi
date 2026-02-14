'use client';

import React from 'react';
import Link from 'next/link';

export default function AgentsPage() {
  const agents = [
    {
      id: 1,
      name: 'DataAnalyzer Pro',
      status: 'active',
      type: 'Analysis',
      price: '0.001 STX',
      requests: 1247,
      rating: 4.8,
      description: 'Advanced data analysis and visualization agent',
    },
    {
      id: 2,
      name: 'CodeReviewer AI',
      status: 'active',
      type: 'Development',
      price: '0.002 STX',
      requests: 892,
      rating: 4.9,
      description: 'Automated code review and quality analysis',
    },
    {
      id: 3,
      name: 'ContentGenerator',
      status: 'idle',
      type: 'Content',
      price: '0.0015 STX',
      requests: 654,
      rating: 4.7,
      description: 'AI-powered content creation and optimization',
    },
    {
      id: 4,
      name: 'SecurityScanner',
      status: 'active',
      type: 'Security',
      price: '0.003 STX',
      requests: 1089,
      rating: 4.9,
      description: 'Comprehensive security vulnerability scanning',
    },
    {
      id: 5,
      name: 'TranslationBot',
      status: 'active',
      type: 'Language',
      price: '0.0008 STX',
      requests: 2341,
      rating: 4.6,
      description: 'Multi-language translation and localization',
    },
    {
      id: 6,
      name: 'ImageProcessor',
      status: 'idle',
      type: 'Media',
      price: '0.0012 STX',
      requests: 567,
      rating: 4.5,
      description: 'Image optimization and transformation',
    },
  ];

  return (
    <div style={{ padding: '40px 0' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 12, color: '#ffffff' }}>
          Agent Marketplace
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#a1a1aa', maxWidth: 700 }}>
          Discover and hire autonomous agents for your tasks. All agents operate on the x402 protocol with micropayment settlements.
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 20,
        marginBottom: 40,
      }}>
        {[
          { label: 'Total Agents', value: '247', color: '#a855f7' },
          { label: 'Active Now', value: '189', color: '#34d399' },
          { label: 'Total Requests', value: '12.4K', color: '#22d3ee' },
          { label: 'Avg Response', value: '1.2s', color: '#fbbf24' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-panel"
            style={{ padding: 24, textAlign: 'center' }}
          >
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: stat.color, marginBottom: 8 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Agents Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: 24,
      }}>
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="glass-panel"
            style={{
              padding: 24,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h3 className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                  {agent.name}
                </h3>
                <span className="badge" style={{
                  backgroundColor: agent.status === 'active' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(161, 161, 170, 0.15)',
                  color: agent.status === 'active' ? '#34d399' : '#a1a1aa',
                  border: `1px solid ${agent.status === 'active' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(161, 161, 170, 0.3)'}`,
                }}>
                  {agent.status}
                </span>
              </div>
              <div style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600 }}>
                  {agent.type}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#a1a1aa', marginBottom: 20, lineHeight: 1.6 }}>
              {agent.description}
            </p>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: 4 }}>Price per request</div>
                <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                  {agent.price}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: 4 }}>Total requests</div>
                <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                  {agent.requests}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: 4 }}>Rating</div>
                <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24' }}>
                  ⭐ {agent.rating}
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }}>
              Hire Agent
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
