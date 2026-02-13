
export interface AgentCard {
  id: string;
  name: string;
  description: string;
  capabilities: string[]; // e.g. ["audit", "verify"]
  protocol: 'x402-REST' | 'MCP-Connect';
  price: { amount: number; unit: 'STX' | 'sBTC' };
  reputation: number;
}

// 1. Define the "External" Agents (The Mock Registry)
export const EXTERNAL_AGENTS: AgentCard[] = [
  {
    id: 'auditor-zero',
    name: 'Auditor Zero (Security)',
    description: 'Top-tier smart contract auditor. Specializes in re-entrancy and flash loan attack prevention.',
    capabilities: ['smart-contract-audit', 'gas-optimization'],
    protocol: 'MCP-Connect',
    price: { amount: 0.05, unit: 'STX' },
    reputation: 98
  },
  {
    id: 'market-alpha',
    name: 'Market Alpha (Finance)',
    description: 'AI-driven market sentiment analysis and price prediction engine for Stacks/Bitcoin DeFi.',
    capabilities: ['price-prediction', 'sentiment-analysis'],
    protocol: 'x402-REST',
    price: { amount: 0.02, unit: 'STX' },
    reputation: 92
  },
  {
    id: 'legal-lens',
    name: 'Legal Lens (Compliance)',
    description: 'Automated legal compliance checks for licensing and IP verification in web3 projects.',
    capabilities: ['ip-review', 'license-check'],
    protocol: 'MCP-Connect',
    price: { amount: 0.10, unit: 'STX' },
    reputation: 95
  }
];

// 2. The Universal Caller (Simulates remote calls)
export async function callExternalAgent(agentId: string, task: string) {
  const agent = EXTERNAL_AGENTS.find(a => a.id === agentId);
  if (!agent) throw new Error("Agent not found");

  console.log(`[Gateway] Connecting to ${agent.name} via ${agent.protocol}...`);

  // Simulate network latency (Critical for realism!)
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Return a "Mock" result based on the agent's persona
  if (agent.id === 'auditor-zero') {
    return {
      status: 'success',
      report: `Audit complete for task: "${task}". No re-entrancy vulnerabilities found. Gas efficiency: 94%.`,
      signature: '0xabc...signed_by_auditor'
    };
  }

  if (agent.id === 'market-alpha') {
    return {
      status: 'success',
      prediction: 'Bullish divergence detected on STX/USD.',
      confidence: '87%',
      data_source: 'CoinGecko + On-Chain Volume'
    };
  }

  if (agent.id === 'legal-lens') {
    return {
      status: 'success',
      verdict: 'Compliant',
      notes: 'License compatible with MIT/Apache-2.0. No IP violations detected.',
      jurisdiction: 'Global-Digital'
    };
  }

  return { status: 'error', message: 'Agent busy' };
}
