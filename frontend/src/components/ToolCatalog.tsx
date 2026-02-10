'use client';

import { useEffect, useState } from 'react';

interface Tool {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  price: { STX: number; sBTC_sats: number };
  description: string;
}

interface ToolCatalogProps {
  apiBase: string;
}

export default function ToolCatalog({ apiBase }: ToolCatalogProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBase}/api/tools`)
      .then((res) => res.json())
      .then((data) => {
        setTools(data.tools || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiBase]);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <span className="icon">&#128295;</span> Available Tools
        </h3>
        <span className="badge badge-network">{tools.length} tools</span>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="loading-bar" />
          Loading tools...
        </div>
      ) : tools.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#128268;</div>
          <p>No tools found. Is the backend running?</p>
        </div>
      ) : (
        <div className="tool-list">
          {tools.map((tool) => (
            <div key={tool.id} className="tool-item">
              <div className="tool-info">
                <h4>
                  {tool.name}
                  <span className="tool-method">{tool.method}</span>
                </h4>
                <p>{tool.description}</p>
              </div>
              <div className="tool-price">{tool.price.STX} STX</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
