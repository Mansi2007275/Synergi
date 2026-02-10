'use client';

interface ToolCallResult {
  tool: string;
  success: boolean;
  data: Record<string, unknown> | null;
  payment?: {
    transaction: string;
    token: string;
    amount: string;
    explorerUrl: string;
  };
  error?: string;
}

interface AgentPlan {
  query: string;
  toolCalls: { toolId: string; params: Record<string, unknown> }[];
  reasoning: string;
}

interface AgentResult {
  query: string;
  plan: AgentPlan;
  results: ToolCallResult[];
  finalAnswer: string;
  totalCost: number;
}

interface ResultsCardProps {
  result: AgentResult;
}

export default function ResultsCard({ result }: ResultsCardProps) {
  return (
    <div className="card results-card">
      <div className="card-header">
        <h3 className="card-title">
          <span className="icon">&#10003;</span> Result
        </h3>
        <span className="cost-badge">
          {result.totalCost} STX
        </span>
      </div>

      <div className="result-answer">{result.finalAnswer}</div>

      <div className="result-plan">
        <strong>Plan: </strong>
        {result.plan.reasoning}
      </div>

      <div className="result-tools">
        {result.results.map((r, i) => (
          <div key={i} className="result-tool-item">
            <div>
              <div className="result-tool-name">
                {r.success ? '✓' : '✗'} {r.tool}
              </div>
              <div className="result-tool-data">
                {r.success
                  ? JSON.stringify(r.data, null, 0).slice(0, 120)
                  : r.error}
              </div>
            </div>
            {r.payment && (
              <div className="result-tool-payment">
                <div className="cost-badge" style={{ marginBottom: 6 }}>
                  {r.payment.amount}
                </div>
                <a
                  href={r.payment.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="payment-tx"
                >
                  View tx &#8599;
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
