'use client';

import React, { useState, useRef, useEffect } from 'react';
import ExecutionSteps from './ExecutionSteps';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ── Types ──────────────────────────────────────── */

interface StepData {
  label: string;
  detail?: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface ToolResult {
  tool: string;
  result: unknown;
  payment?: {
    transaction: string;
    token: string;
    amount: string;
    explorerUrl: string;
  };
  error?: string;
}

interface Message {
  role: 'user' | 'agent';
  content: string;
  results?: ToolResult[];
  plan?: string[];
  totalCost?: { STX: number; sBTC_sats: number };
  timestamp: string;
}

/* ── Suggested Queries ──────────────────────────── */

const QUICK_QUERIES = [
  'What is the weather in Tokyo and solve 10+5?',
  'Summarize: x402 enables machine-to-machine micropayments on blockchain.',
  'What is the weather in London?',
  'Solve 2^10 + 3*7 - 42',
];

/* ── Component ──────────────────────────────────── */

export default function AgentChat({
  onNewPayments,
}: {
  onNewPayments?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [token, setToken] = useState<'STX' | 'sBTC'>('STX');
  const [clientId] = useState(() => Math.random().toString(36).substring(7));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/agent/events?clientId=${clientId}`);

    es.addEventListener('step', (e: MessageEvent) => {
      const step = JSON.parse(e.data);
      setSteps((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.label === step.label) {
          // If the step is completing or updating the current one
          if (last.status !== 'complete' && last.status !== 'error') {
               return [...prev.slice(0, -1), { ...last, ...step }];
          }
        }
        // If it's a new step or the previous one is already done
        if (last && (last.status === 'active' || last.status === 'pending') && step.status === 'active') {
             // Mark previous as complete if we moving to next active step
             // This logic depends on backend events.
             // Backend sends: "Planning... active", then "Planning... complete"
             // nesting logic might be needed but simple append/update is safer.
        }

        // Better logic: Find if this label exists already and update it?
        // Or just trust the event stream order.
        // Let's rely on label matching for updates.
        const existingIndex = prev.findIndex(p => p.label === step.label);
        if (existingIndex !== -1) {
            const newSteps = [...prev];
            newSteps[existingIndex] = { ...newSteps[existingIndex], ...step };
            return newSteps;
        }
        return [...prev, step];
      });
    });

    es.addEventListener('done', () => {
       // Optional: could auto-clear steps or mark all complete
    });

    return () => {
      es.close();
    };
  }, [clientId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, steps]);

  async function handleSubmit(query?: string) {
    const q = query || input.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setLoading(true);
    setSteps([]); // Clear previous steps

    try {
      const res = await fetch(`${API_BASE}/api/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, token, clientId }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Server responded ${res.status}`);
      }

      const data = await res.json();

      // Ensure all steps are marked complete if not already
      setSteps((prev) => prev.map((s) => ({ ...s, status: s.status === 'error' ? 'error' : 'complete' })));

      const agentMsg: Message = {
        role: 'agent',
        content: data.finalAnswer || 'No response generated.',
        results: data.results,
        plan: data.plan,
        totalCost: data.totalCost,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      onNewPayments?.();
    } catch (err: unknown) {
      setSteps((prev) =>
        prev.map((s) =>
          s.status === 'active' || s.status === 'pending'
            ? { ...s, status: 'error' }
            : s
        )
      );

      const errMsg: Message = {
        role: 'agent',
        content: `Error: ${(err as Error).message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => setSteps([]), 2000);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="agent-chat">
      {/* Header */}
      <div className="agent-chat__header">
        <h2 className="agent-chat__title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Agent Console
        </h2>
        <div className="token-toggle">
          <button
            className={`token-btn ${token === 'STX' ? 'token-btn--active' : ''}`}
            onClick={() => setToken('STX')}
          >
            STX
          </button>
          <button
            className={`token-btn ${token === 'sBTC' ? 'token-btn--active' : ''}`}
            onClick={() => setToken('sBTC')}
          >
            sBTC
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="agent-chat__messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="agent-chat__welcome">
            <div className="welcome-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5">
                <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                <path d="M16 14H8a5 5 0 0 0-5 5v2h18v-2a5 5 0 0 0-5-5z" />
                <circle cx="9" cy="7" r="1" fill="var(--accent-primary)" />
                <circle cx="15" cy="7" r="1" fill="var(--accent-primary)" />
              </svg>
            </div>
            <h3>x402 Autonomous Agent</h3>
            <p>
              Ask me anything. I will autonomously discover the right tools,
              pay for them with {token} on Stacks testnet, and aggregate the results.
            </p>
            <div className="quick-queries">
              {QUICK_QUERIES.map((q, i) => (
                <button key={i} className="quick-btn" onClick={() => handleSubmit(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
            <div className="chat-bubble__role">
              {msg.role === 'user' ? 'You' : 'Agent'}
            </div>
            <div className="chat-bubble__text">{msg.content}</div>

            {/* Tool results */}
            {msg.results && msg.results.length > 0 && (
              <div className="chat-bubble__results">
                {msg.results.map((r, j) => (
                  <div key={j} className="tool-result">
                    <div className="tool-result__header">
                      <span className="tool-result__name">{r.tool}</span>
                      {r.payment && (
                        <a
                          href={r.payment.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tool-result__tx"
                        >
                          {r.payment.amount}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft:4}}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      )}
                    </div>
                    <div className="tool-result__body mono">
                      {typeof r.result === 'string' ? r.result : JSON.stringify(r.result as object, null, 2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total cost */}
            {msg.totalCost && (msg.totalCost.STX > 0 || msg.totalCost.sBTC_sats > 0) && (
              <div className="chat-bubble__cost">
                Total: {msg.totalCost.STX} STX / {msg.totalCost.sBTC_sats} sats sBTC
              </div>
            )}
          </div>
        ))}

        {/* Live execution steps */}
        {loading && <ExecutionSteps steps={steps} />}
      </div>

      {/* Input */}
      <div className="agent-chat__input-area">
        <textarea
          className="agent-chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the agent anything..."
          rows={1}
          disabled={loading}
        />
        <button
          className="btn btn-primary agent-chat__send"
          onClick={() => handleSubmit()}
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

      <style jsx>{`
        .agent-chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 500px;
        }
        .agent-chat__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 16px;
        }
        .agent-chat__title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1rem;
          color: var(--text-primary);
        }
        .token-toggle {
          display: flex;
          gap: 4px;
          background: var(--bg-glass);
          border-radius: var(--radius-sm);
          padding: 3px;
        }
        .token-btn {
          background: transparent;
          color: var(--text-muted);
          border: none;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-mono);
        }
        .token-btn--active {
          background: var(--accent-primary);
          color: white;
        }
        .agent-chat__messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 4px;
          max-height: 460px;
        }
        .agent-chat__welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 32px 16px;
          gap: 12px;
        }
        .welcome-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.2);
        }
        .agent-chat__welcome h3 {
          font-size: 1.2rem;
          color: var(--text-primary);
        }
        .agent-chat__welcome p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          max-width: 380px;
          line-height: 1.5;
        }
        .quick-queries {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 8px;
        }
        .quick-btn {
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.2s;
          max-width: 300px;
          text-align: left;
        }
        .quick-btn:hover {
          border-color: var(--accent-primary);
          color: var(--text-primary);
          background: var(--bg-glass-hover);
        }
        .chat-bubble {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          max-width: 92%;
          animation: fadeInUp 0.3s var(--ease-out);
        }
        .chat-bubble--user {
          align-self: flex-end;
          background: rgba(124, 58, 237, 0.15);
          border: 1px solid rgba(124, 58, 237, 0.2);
        }
        .chat-bubble--agent {
          align-self: flex-start;
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
        }
        .chat-bubble__role {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 4px;
          font-weight: 600;
        }
        .chat-bubble__text {
          font-size: 0.88rem;
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .chat-bubble__results {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tool-result {
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          border: 1px solid var(--border-subtle);
        }
        .tool-result__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .tool-result__name {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-cyan);
        }
        .tool-result__tx {
          display: inline-flex;
          align-items: center;
          font-size: 0.68rem;
          color: var(--accent-success);
          text-decoration: none;
          font-family: var(--font-mono);
        }
        .tool-result__tx:hover { text-decoration: underline; }
        .tool-result__body {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.5;
          word-break: break-word;
        }
        .chat-bubble__cost {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--border-subtle);
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--accent-success);
        }
        .agent-chat__input-area {
          display: flex;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
          margin-top: 16px;
        }
        .agent-chat__input {
          flex: 1;
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          padding: 10px 14px;
          font-size: 0.88rem;
          font-family: var(--font-sans);
          resize: none;
          outline: none;
          transition: border-color 0.2s;
        }
        .agent-chat__input:focus {
          border-color: var(--accent-primary);
        }
        .agent-chat__input::placeholder {
          color: var(--text-muted);
        }
        .agent-chat__send {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
