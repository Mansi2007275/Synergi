import React, { useState, useEffect } from 'react';
import { Search, Server, Cpu, Globe, ArrowRight, ShieldCheck, Box } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  token: string;
  canHireSubAgents: boolean;
  reputation: number; // 0-100
  isExternal?: boolean;
  mcpCompatible?: boolean;
}

export default function ToolCatalog() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002'}/api/tools`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          description: t.description,
          price: t.price?.STX || 0,
          token: 'STX',
          canHireSubAgents: t.canHireSubAgents,
          reputation: t.reputation || 95,
          isExternal: t.isExternal,
          mcpCompatible: t.mcpCompatible
        }));
        setTools(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch tools", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="mono" style={{ padding: 20 }}>Loading agent network...</div>;

  return (
    <div style={{ marginTop: 24, padding: 24, borderTop: '2px solid var(--border-strong)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 className="mono" style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Box size={20} /> AVAILABLE AGENTS
        </h3>
        <div className="badge badge-stx">
           <Globe size={12} style={{ marginRight: 6 }} />
           GLOBAL NETWORK
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {tools.map(tool => (
          <AgentCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ tool }: { tool: Tool }) {
  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)',
      padding: 20,
      cursor: 'pointer',
      transition: 'all 0.1s',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '4px 4px 0 0 #000'
    }}
    onMouseEnter={e => {
        e.currentTarget.style.transform = 'translate(-2px, -2px)';
        e.currentTarget.style.boxShadow = '6px 6px 0 0 var(--accent-primary)';
        e.currentTarget.style.borderColor = tool.isExternal ? 'var(--accent-cyan)' : 'var(--accent-primary)';
    }}
    onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '4px 4px 0 0 #000';
        e.currentTarget.style.borderColor = 'var(--border-strong)';
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            background: tool.isExternal ? 'rgba(34, 211, 238, 0.1)' : 'rgba(168, 85, 247, 0.1)',
            border: `1px solid ${tool.isExternal ? 'var(--accent-cyan)' : 'var(--accent-primary)'}`,
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '2px 2px 0 0 #000'
          }}>
            {tool.isExternal ? <Globe size={20} color="var(--accent-cyan)" /> : <Cpu size={20} color="var(--accent-primary)" />}
          </div>
          <div>
             <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{tool.name}</h4>
             <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tool.category}</span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
        {tool.description}
      </p>

      <div style={{
        paddingTop: 16,
        borderTop: '1px dashed var(--border-strong)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {tool.mcpCompatible && (
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              background: 'var(--accent-success)',
              color: '#000',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent-success)'
            }}>
              MCP
            </div>
          )}
          {tool.canHireSubAgents && (
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              background: 'var(--accent-secondary)',
              color: '#000',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent-secondary)'
            }}>
              A2A
            </div>
          )}
        </div>

        <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
           {Number(tool.price) > 0 ? `${tool.price} ${tool.token}` : 'FREE'}
        </div>
      </div>
    </div>
  );
}
