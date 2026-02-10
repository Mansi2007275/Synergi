'use client';

import { useState } from 'react';

interface QueryPanelProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  'Weather in Tokyo',
  'Calculate 42 * 3 + 100',
  'Summarize: x402 enables machine-to-machine payments on Bitcoin via the Stacks blockchain',
  'Weather in London and calculate 2 ^ 10',
];

export default function QueryPanel({ onSubmit, isLoading }: QueryPanelProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
  };

  const handleExample = (example: string) => {
    setQuery(example);
    onSubmit(example);
  };

  return (
    <div className="query-panel">
      <div className="card-header">
        <h3 className="card-title">
          <span className="icon">&#9889;</span> Ask the Agent
        </h3>
        {isLoading && <span className="cost-badge"><span className="loading-spinner" /> Processing</span>}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="query-input-row">
          <input
            className="query-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about weather, math, or request a text summary..."
            disabled={isLoading}
          />
          <button className="query-submit" type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? 'Thinking...' : 'Send & Pay'}
          </button>
        </div>
      </form>

      <div className="query-examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className="example-chip"
            onClick={() => handleExample(ex)}
            disabled={isLoading}
            type="button"
          >
            {ex.length > 40 ? ex.slice(0, 40) + '...' : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
