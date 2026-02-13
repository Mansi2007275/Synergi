import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal, Loader2, Shield, Zap, DollarSign, Activity } from 'lucide-react';

interface Params {
  onNewPayments: (amount: number) => void;
  onProtocolTrace: (log: any) => void;
}

interface Message {
  role: 'user' | 'system' | 'assistant';
  content: string;
  cost?: number;
  depth?: number;
}

const SimpleMarkdown = ({ text }: { text: string }) => {
  // Ultra-simple markdown parser for bold and code
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--accent-primary)' }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              background: 'var(--bg-tertiary)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)'
            }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </span>
  );
};

export default function AgentChat({ onNewPayments, onProtocolTrace }: Params) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: "**System Initialized.** Universal Agent Adapter ready. Connects to `Gemini 2.0 Flash` (Internal) and `MCP-Connect` (External).",
      depth: 0
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'planning' | 'executing' | 'verifying'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);
    setAgentStatus('planning');

    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const encodedQuery = encodeURIComponent(userMsg);
      const sse = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002'}/api/agent/manager/stream?query=${encodedQuery}`);
      eventSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'step' || data.type === 'thought' || data.type === 'tool_result') {
            onProtocolTrace(data);
          }

          if (data.type === 'thought') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: data.content,
              depth: 1
            }]);
          } else if (data.type === 'payment') {
             onNewPayments(data.amount);
             onProtocolTrace({ type: 'payment', amount: data.amount, agent: data.agent });
          } else if (data.type === 'result') {
            setMessages(prev => [...prev, {
              role: 'system',
              content: `**Execution Complete.** Result: ${data.content}`,
              depth: 0
            }]);
            setAgentStatus('idle');
            setIsProcessing(false);
            sse.close();
          } else if (data.type === 'error') {
            setMessages(prev => [...prev, {
              role: 'system',
              content: `**Error:** ${data.content}`,
              depth: 0
            }]);
            setAgentStatus('idle');
            setIsProcessing(false);
            sse.close();
          }
        } catch (err) {
          console.error('SSE Parse Error:', err);
        }
      };

      sse.onerror = (err) => {
        console.error('SSE Error:', err);
        setIsProcessing(false);
        setAgentStatus('idle');
        sse.close();

        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last.content.includes('Execution Complete')) return prev;
            return [...prev, { role: 'system', content: "**Connection terminated.**" }];
        });
      };

    } catch (error) {
      console.error('API Error:', error);
      setIsProcessing(false);
      setAgentStatus('idle');
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{
        paddingBottom: 20,
        borderBottom: '2px solid var(--border-strong)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
             width: 40, height: 40,
             background: 'var(--accent-primary)',
             boxShadow: '4px 4px 0 0 #000',
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             borderRadius: 'var(--radius-sm)'
          }}>
            <Terminal size={24} color="#000" strokeWidth={3} />
          </div>
          <div>
            <h2 className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Manager Agent
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                width: 8, height: 8, background: agentStatus === 'idle' ? 'var(--text-muted)' : 'var(--accent-success)',
                borderRadius: '50%', border: '1px solid #000'
              }} />
              <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {agentStatus === 'idle' ? 'STANDBY' : agentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'flex', gap: 12 }}>
           <div className="badge badge-stx">
              <Shield size={12} style={{ marginRight: 6 }} />
              SECURE
           </div>
           <div className="badge badge-sbtc">
              <Zap size={12} style={{ marginRight: 6 }} />
              FAST
           </div>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        paddingRight: 10,
        marginBottom: 20
      }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          return (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
            }}>
              {/* Role Label */}
              <span className="mono" style={{
                fontSize: '0.65rem',
                marginBottom: 4,
                color: 'var(--text-muted)',
                marginLeft: isUser ? 0 : 4,
                marginRight: isUser ? 4 : 0,
                textTransform: 'uppercase'
              }}>
                {isUser ? 'YOU' : isSystem ? 'SYSTEM' : 'AGENT'}
              </span>

              {/* Message Bubble */}
              <div style={{
                maxWidth: isSystem ? '100%' : '85%',
                padding: '16px 20px',
                background: isUser ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                border: `1px solid ${isUser ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                boxShadow: `4px 4px 0 0 ${isUser ? 'var(--accent-primary)' : '#000'}`,
                color: isUser ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                transform: isUser ? 'translate(-2px, -2px)' : 'none'
              }}>
                <SimpleMarkdown text={msg.content} />

                {msg.cost && (
                  <div style={{
                    marginTop: 12,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--accent-warning)',
                    fontSize: '0.75rem'
                  }} className="mono">
                    <DollarSign size={12} />
                    <span>COST: {msg.cost} sBTC</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Execute a complex task..."
          disabled={isProcessing}
          className="mono"
          style={{
            width: '100%',
            background: 'var(--bg-primary)',
            border: '2px solid var(--border-strong)',
            color: 'var(--text-primary)',
            padding: '16px 20px',
            paddingRight: 60,
            fontSize: '1rem',
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            boxShadow: 'inset 4px 4px 0 0 rgba(0,0,0,0.5)'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
        />
        <button
          type="submit"
          disabled={!query.trim() || isProcessing}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: query.trim() && !isProcessing ? 'var(--accent-primary)' : 'var(--border-strong)',
            border: 'none',
            color: '#000',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            cursor: query.trim() && !isProcessing ? 'pointer' : 'default',
            boxShadow: query.trim() && !isProcessing ? '2px 2px 0 0 #000' : 'none',
            transition: 'all 0.1s'
          }}
        >
          {isProcessing ? <Loader2 size={20} className="spin" /> : <Send size={20} strokeWidth={3} />}
        </button>
      </form>

      {/* ── Status Bar ── */}
      {isProcessing && (
         <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: 'var(--text-muted)',
            fontSize: '0.8rem'
         }} className="mono">
            <Activity size={14} className="spin" color="var(--accent-success)" />
            <span>AGENT IS THINKING...</span>
         </div>
      )}
    </div>
  );
}
