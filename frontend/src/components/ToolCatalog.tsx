'use client';

import React, { useEffect, useState } from 'react';

interface Tool {
  id: string;
  name: string;
  description: string;
  price: {
    STX: number;
    sBTC_sats: number;
  };
  endpoint: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ToolCatalog() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/tools`)
      .then(res => res.json())
      .then(data => {
        setTools(data.tools || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load tools:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="tool-grid-skeleton">Loading tools...</div>;

  return (
    <div className="tool-catalog">
      <h3 className="section-title">Available Tools</h3>
      <div className="tool-grid">
        {tools.map(tool => (
          <div key={tool.id} className="tool-card glass-panel">
            <div className="tool-card__header">
              <span className="tool-icon">
                {/* Simple icon mapping based on ID */}
                {tool.id.includes('weather') && '🌦'}
                {tool.id.includes('summarize') && '📝'}
                {tool.id.includes('math') && '🧮'}
                {tool.id.includes('sentiment') && '🎭'}
                {tool.id.includes('code') && '💻'}
              </span>
              <h4 className="tool-name">{tool.name}</h4>
            </div>
            <p className="tool-desc">{tool.description}</p>
            <div className="tool-prices">
              <span className="badge badge-stx">{tool.price.STX} STX</span>
              <span className="badge badge-sbtc">{tool.price.sBTC_sats} sats</span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .tool-catalog {
          margin-top: 32px;
        }
        .section-title {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .tool-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }
        .tool-card {
          padding: 20px;
          transition: transform 0.2s, border-color 0.2s;
          cursor: default;
        }
        .tool-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-primary);
        }
        .tool-card__header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .tool-icon {
          font-size: 1.5rem;
          background: rgba(255,255,255,0.05);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
        }
        .tool-name {
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .tool-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 16px;
          height: 40px; /* Force consistent height */
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .tool-prices {
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
