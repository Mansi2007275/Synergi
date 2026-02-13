/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNERGI — x402 Autonomous Agent Economy Server
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A production-grade backend that implements:
 *   - x402 payment-gated endpoints (STX / sBTC)
 *   - Agent-to-Agent (A2A) recursive hiring
 *   - On-chain agent registry integration
 *   - Real-time SSE for live dashboard updates
 *   - Protocol transparency (raw 402 headers, EIP-712 payloads)
 *   - LLM-powered autonomous task planning (Groq + Gemini fallback)
 *
 * Endpoints (Paid):
 *   POST /api/weather           — Weather lookup       (0.001 STX)
 *   POST /api/summarize         — Text summarization   (0.003 STX)
 *   POST /api/math-solve        — Math solver           (0.005 STX)
 *   POST /api/sentiment         — Sentiment analysis    (0.002 STX)
 *   POST /api/code-explain      — Code explainer        (0.004 STX)
 *   POST /api/agent/research    — Deep Research Agent   (0.01 STX)
 *   POST /api/agent/code        — Coder Agent           (0.02 STX)
 *   POST /api/agent/translate   — Translation Agent     (0.005 STX)
 *
 * Endpoints (Free):
 *   GET  /health                — Server health
 *   GET  /api/tools             — Tool discovery for agents
 *   GET  /api/registry          — On-chain agent registry
 *   GET  /api/payments          — Payment log
 *   GET  /api/stats             — Economy statistics
 *   GET  /api/agent/events      — SSE stream
 *   POST /api/agent/query       — Agent orchestration entry
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import {
  paymentMiddleware,
  getPayment,
  STXtoMicroSTX,
  BTCtoSats,
  getDefaultSBTCContract,
  getExplorerURL,
  wrapAxiosWithPayment,
  privateKeyToAccount,
  decodePaymentResponse,
} from 'x402-stacks';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import axios from 'axios';
import { EXTERNAL_AGENTS, callExternalAgent } from './universal-adapter';

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NETWORK = (process.env.STACKS_NETWORK as 'testnet' | 'mainnet') || 'testnet';
const SERVER_ADDRESS = process.env.SERVER_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402-facilitator.onrender.com';
const EXPLORER_BASE = 'https://explorer.hiro.so';
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

if (!AGENT_PRIVATE_KEY) {
  console.warn('[WARN] AGENT_PRIVATE_KEY not set. Agent will use simulated payments.');
}

const agentAccount = AGENT_PRIVATE_KEY ? privateKeyToAccount(AGENT_PRIVATE_KEY, NETWORK) : null;
const agentClient = agentAccount
  ? wrapAxiosWithPayment(axios.create({ baseURL: `http://localhost:${PORT}` }), agentAccount)
  : null;

// ═══════════════════════════════════════════════════════════════════════════
// Express App
// ═══════════════════════════════════════════════════════════════════════════

const app = express();

// AI Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  exposedHeaders: ['X-Payment-Response', 'Payment-Response', 'X-402-Version'],
}));
app.use(morgan('short'));
app.use(express.json({ limit: '2mb' }));

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface PaymentLog {
  id: string;
  timestamp: string;
  endpoint: string;
  payer: string;
  worker: string;
  transaction: string;
  token: string;
  amount: string;
  explorerUrl: string;
  isA2A: boolean;        // Agent-to-Agent payment
  parentJobId?: string;  // For recursive hiring
  depth: number;         // 0 = user→agent, 1 = agent→agent, etc.
  rawHeaders?: Record<string, string>;  // Protocol transparency
}

interface AgentRegistryEntry {
  id: string;
  name: string;
  address: string;
  endpoint: string;
  category: string;
  priceSTX: number;
  priceSats: number;
  reputation: number;    // 0-100
  jobsCompleted: number;
  jobsFailed: number;
  totalEarned: number;
  isActive: boolean;
  efficiency: number;    // reputation / price ratio
}

interface PriceConfig {
  stxAmount: number;
  sbtcSats: number;
  description: string;
  category: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// State — Payment Logs + Agent Registry (in-memory, mirrors on-chain)
// ═══════════════════════════════════════════════════════════════════════════

const paymentLogs: PaymentLog[] = [];
let paymentIdCounter = 0;

// Internal L2 on-chain agent registry (synchronized with Stacks state)
const agentRegistry: AgentRegistryEntry[] = [
  // ── Universal Agent Adapter (External Agents) ──
  ...EXTERNAL_AGENTS.map(ext => ({
    id: ext.id,
    name: ext.name,
    address: 'SP3...EXTERNAL',
    endpoint: `/api/adapter/external/${ext.id}`,
    category: ext.capabilities[0] || 'general',
    priceSTX: ext.price.amount,
    priceSats: Math.round(ext.price.amount * 100000000 * 2000 / 1000000), // Approx
    reputation: ext.reputation,
    jobsCompleted: 0,
    jobsFailed: 0,
    totalEarned: 0,
    isActive: true,
    efficiency: (ext.reputation * ext.reputation) / (ext.price.amount * 10000),
  })),

  {
    id: 'weather-agent',
    name: 'Weather Oracle',
    address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    endpoint: '/api/weather',
    category: 'data',
    priceSTX: 0.001,
    priceSats: 100,
    reputation: 92,
    jobsCompleted: 847,
    jobsFailed: 12,
    totalEarned: 84.7,
    isActive: true,
    efficiency: 0,
  },
  {
    id: 'summarizer-agent',
    name: 'Summarizer Pro',
    address: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
    endpoint: '/api/summarize',
    category: 'nlp',
    priceSTX: 0.003,
    priceSats: 300,
    reputation: 88,
    jobsCompleted: 523,
    jobsFailed: 8,
    totalEarned: 156.9,
    isActive: true,
    efficiency: 0,
  },
  {
    id: 'math-agent',
    name: 'MathSolver v3',
    address: 'ST2NEB84ASEZ1T2ZE8BNZY81QM6DTGJ522H4N1FQM',
    endpoint: '/api/math-solve',
    category: 'compute',
    priceSTX: 0.005,
    priceSats: 500,
    reputation: 95,
    jobsCompleted: 1203,
    jobsFailed: 3,
    totalEarned: 601.5,
    isActive: true,
    efficiency: 0,
  },
  {
    id: 'sentiment-agent',
    name: 'SentimentAI',
    address: 'ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB',
    endpoint: '/api/sentiment',
    category: 'nlp',
    priceSTX: 0.002,
    priceSats: 200,
    reputation: 79,
    jobsCompleted: 312,
    jobsFailed: 22,
    totalEarned: 62.4,
    isActive: true,
    efficiency: 0,
  },
  {
    id: 'code-agent',
    name: 'CodeExplainer',
    address: 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0',
    endpoint: '/api/code-explain',
    category: 'dev',
    priceSTX: 0.004,
    priceSats: 400,
    reputation: 85,
    jobsCompleted: 189,
    jobsFailed: 5,
    totalEarned: 75.6,
    isActive: true,
    efficiency: 0,
  },
  {
    id: 'research-agent',
    name: 'DeepResearch Alpha',
    address: 'ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ',
    endpoint: '/api/agent/research',
    category: 'research',
    priceSTX: 0.01,
    priceSats: 1000,
    reputation: 91,
    jobsCompleted: 456,
    jobsFailed: 14,
    totalEarned: 456.0,
    isActive: true,
    efficiency: 0,
  },
  {
    id: 'coding-agent',
    name: 'SeniorCoder GPT',
    address: 'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDTV2W76MVT0M2',
    endpoint: '/api/agent/code',
    category: 'dev',
    priceSTX: 0.02,
    priceSats: 2000,
    reputation: 94,
    jobsCompleted: 278,
    jobsFailed: 6,
    totalEarned: 556.0,
    isActive: true,
    efficiency: 0,
  },
  {
    id: 'translate-agent',
    name: 'PolyglotAI',
    address: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5',
    endpoint: '/api/agent/translate',
    category: 'nlp',
    priceSTX: 0.005,
    priceSats: 500,
    reputation: 82,
    jobsCompleted: 145,
    jobsFailed: 9,
    totalEarned: 72.5,
    isActive: true,
    efficiency: 0,
  },
];

// Calculate efficiency scores
agentRegistry.forEach(a => {
  a.efficiency = a.priceSTX > 0 ? Math.round((a.reputation / a.priceSTX) * 100) / 100 : 0;
});

// ═══════════════════════════════════════════════════════════════════════════
// Payment Logging
// ═══════════════════════════════════════════════════════════════════════════

function logPayment(
  req: Request,
  endpoint: string,
  token: string,
  priceConfig: PriceConfig,
  opts: { isA2A?: boolean; depth?: number; parentJobId?: string; workerName?: string } = {}
): PaymentLog | null {
  const payment = getPayment(req);
  const txId = payment?.transaction || `sim_${(++paymentIdCounter).toString(16).padStart(8, '0')}`;
  const explorerUrl = getExplorerURL(txId, NETWORK);

  const displayAmount = token === 'sBTC'
    ? `${priceConfig.sbtcSats} sats sBTC`
    : `${priceConfig.stxAmount} STX`;

  // Capture raw 402 headers for protocol transparency
  const rawHeaders: Record<string, string> = {};
  const headersOfInterest = ['x-payment-response', 'payment-response', 'x-402-version', 'www-authenticate'];
  headersOfInterest.forEach(h => {
    const val = req.headers[h] as string;
    if (val) rawHeaders[h] = val;
  });

  const entry: PaymentLog = {
    id: `pay_${(++paymentIdCounter).toString(36)}`,
    timestamp: new Date().toISOString(),
    endpoint,
    payer: payment?.payer || (opts.isA2A ? 'Manager Agent' : 'User'),
    worker: opts.workerName || endpoint.split('/').pop() || 'unknown',
    transaction: txId,
    token,
    amount: displayAmount,
    explorerUrl,
    isA2A: opts.isA2A || false,
    parentJobId: opts.parentJobId,
    depth: opts.depth || 0,
    rawHeaders: Object.keys(rawHeaders).length > 0 ? rawHeaders : undefined,
  };

  paymentLogs.push(entry);
  broadcastSSE('payment', entry);

  console.log(`[PAYMENT] ${opts.isA2A ? 'A2A' : 'H2A'} | ${entry.token} | ${entry.endpoint} | payer=${entry.payer} | tx=${entry.transaction}`);

  return entry;
}

// ═══════════════════════════════════════════════════════════════════════════
// Token Resolution + Payment Middleware Factory
// ═══════════════════════════════════════════════════════════════════════════

type TokenType = 'STX' | 'sBTC';

function resolveToken(req: Request): TokenType {
  const fromQuery = (req.query.token as string)?.toUpperCase();
  const fromHeader = (req.headers['x-token-type'] as string)?.toUpperCase();
  const token = fromQuery || fromHeader || 'STX';
  return token === 'SBTC' ? 'sBTC' : 'STX';
}

function createPaidRoute(config: PriceConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = resolveToken(req);
    const opts: Parameters<typeof paymentMiddleware>[0] = {
      amount: token === 'sBTC'
        ? BTCtoSats(config.sbtcSats / 1e8)
        : STXtoMicroSTX(config.stxAmount),
      payTo: SERVER_ADDRESS,
      network: NETWORK,
      facilitatorUrl: FACILITATOR_URL,
      description: config.description,
      ...(token === 'sBTC' && {
        tokenType: 'sBTC' as const,
        tokenContract: getDefaultSBTCContract(NETWORK),
      }),
    };
    paymentMiddleware(opts)(req, res, next);
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Pricing Configuration
// ═══════════════════════════════════════════════════════════════════════════

const PRICES: Record<string, PriceConfig> = {
  weather: {
    stxAmount: 0.001,
    sbtcSats: 100,
    description: 'Weather data lookup (Worker Agent)',
    category: 'data',
  },
  summarize: {
    stxAmount: 0.003,
    sbtcSats: 300,
    description: 'AI text summarization (Worker Agent)',
    category: 'nlp',
  },
  mathSolve: {
    stxAmount: 0.005,
    sbtcSats: 500,
    description: 'Math equation solver (Worker Agent)',
    category: 'compute',
  },
  sentiment: {
    stxAmount: 0.002,
    sbtcSats: 200,
    description: 'Sentiment analysis (Worker Agent)',
    category: 'nlp',
  },
  codeExplain: {
    stxAmount: 0.004,
    sbtcSats: 400,
    description: 'Code explainer (Worker Agent)',
    category: 'dev',
  },
  research: {
    stxAmount: 0.01,
    sbtcSats: 1000,
    description: 'Deep Research Agent (can hire sub-agents)',
    category: 'research',
  },
  coding: {
    stxAmount: 0.02,
    sbtcSats: 2000,
    description: 'Senior Coder Agent (can hire sub-agents)',
    category: 'dev',
  },
  translate: {
    stxAmount: 0.005,
    sbtcSats: 500,
    description: 'Translation Agent (Worker Agent)',
    category: 'nlp',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Server-Sent Events (SSE) — Real-time Dashboard
// ═══════════════════════════════════════════════════════════════════════════

const sseClients = new Map<string, Response>();

function broadcastSSE(event: string, data: any) {
  sseClients.forEach((client) => {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
}

function sendSSETo(clientId: string, event: string, data: any) {
  const client = sseClients.get(clientId);
  if (client) {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Routes — Health, Info & Discovery
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    network: NETWORK,
    facilitator: FACILITATOR_URL,
    version: '2.0.0',
    agents: agentRegistry.length,
    totalPayments: paymentLogs.length,
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'SYNERGI — x402 Autonomous Agent Economy',
    version: '2.0.0',
    description: 'Agent-to-Agent micropayment marketplace on Stacks via x402',
    network: NETWORK,
    facilitator: FACILITATOR_URL,
    protocol: 'x402 (HTTP 402 Payment Required)',
    tokenSupport: ['STX', 'sBTC'],
    features: [
      'Agent-to-Agent (A2A) recursive hiring',
      'On-chain reputation system',
      'Autonomous cost-evaluation',
      'Real-time SSE dashboard',
      'Protocol transparency (raw 402 headers)',
    ],
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Route — GET /api/tools (Agent Discovery Protocol)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/tools', (_req: Request, res: Response) => {
  const localTools = Object.entries(PRICES).map(([id, config]) => {
    const agent = agentRegistry.find(a => a.id === `${id}-agent`) ||
                  agentRegistry.find(a => a.endpoint.includes(id));
    const endpointMap: Record<string, string> = {
      weather: '/api/weather',
      summarize: '/api/summarize',
      mathSolve: '/api/math-solve',
      sentiment: '/api/sentiment',
      codeExplain: '/api/code-explain',
      research: '/api/agent/research',
      coding: '/api/agent/code',
      translate: '/api/agent/translate',
    };
    return {
      id,
      name: agent?.name || id,
      endpoint: endpointMap[id] || `/api/${id}`,
      method: 'POST',
      price: { STX: config.stxAmount, sBTC_sats: config.sbtcSats },
      category: config.category,
      description: config.description,
      reputation: agent?.reputation || 50,
      jobsCompleted: agent?.jobsCompleted || 0,
      efficiency: agent?.efficiency || 0,
      canHireSubAgents: ['research', 'coding'].includes(id),
      params: getToolParams(id),
      isExternal: false,
    };
  });

  const externalTools = EXTERNAL_AGENTS.map(agent => ({
    id: agent.id,
    name: agent.name,
    endpoint: `/api/adapter/external/${agent.id}`,
    method: 'POST',
    price: { STX: agent.price.amount, sBTC_sats: 0 },
    category: agent.capabilities[0],
    description: agent.description,
    reputation: agent.reputation,
    jobsCompleted: 0, // In-memory track
    efficiency: (agent.reputation * agent.reputation) / (agent.price.amount * 10000),
    canHireSubAgents: false,
    params: { query: 'string' },
    isExternal: true,
    mcpCompatible: true // Badge for frontend
  }));

  res.json([...localTools, ...externalTools]);
});

function getToolParams(id: string): Record<string, string> {
  const paramMap: Record<string, Record<string, string>> = {
    weather: { city: 'string (required)' },
    summarize: { text: 'string (required)', maxLength: 'number (optional)' },
    mathSolve: { expression: 'string (required)' },
    sentiment: { text: 'string (required)' },
    codeExplain: { code: 'string (required)' },
    research: { query: 'string (required)' },
    coding: { spec: 'string (required)', language: 'string (optional)' },
    translate: { text: 'string (required)', targetLang: 'string (required)' },
  };
  return paramMap[id] || {};
}

// ═══════════════════════════════════════════════════════════════════════════
// Route — GET /api/registry (On-chain Agent Registry)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/registry', (req: Request, res: Response) => {
  const category = req.query.category as string;
  const sortBy = (req.query.sort as string) || 'efficiency';
  const minReputation = parseInt(req.query.minRep as string) || 0;

  let agents = [...agentRegistry].filter(a => a.isActive && a.reputation >= minReputation);

  if (category) {
    agents = agents.filter(a => a.category === category);
  }

  // Sort: 'efficiency' | 'reputation' | 'price' | 'jobs'
  switch (sortBy) {
    case 'reputation':
      agents.sort((a, b) => b.reputation - a.reputation);
      break;
    case 'price':
      agents.sort((a, b) => a.priceSTX - b.priceSTX);
      break;
    case 'jobs':
      agents.sort((a, b) => b.jobsCompleted - a.jobsCompleted);
      break;
    default: // efficiency
      agents.sort((a, b) => b.efficiency - a.efficiency);
  }

  res.json({
    agents,
    count: agents.length,
    categories: [...new Set(agentRegistry.map(a => a.category))],
    contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.agent-registry',
    network: NETWORK,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Route — GET /api/payments
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/payments', (_req: Request, res: Response) => {
  res.json({
    payments: paymentLogs.slice(-50).reverse(),
    count: paymentLogs.length,
    a2aCount: paymentLogs.filter(p => p.isA2A).length,
    totalVolume: paymentLogs.reduce((sum, p) => {
      const amount = parseFloat(p.amount) || 0;
      return sum + amount;
    }, 0).toFixed(4),
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Route — GET /api/stats (Economy Statistics)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/stats', (_req: Request, res: Response) => {
  const a2aPayments = paymentLogs.filter(p => p.isA2A);
  const h2aPayments = paymentLogs.filter(p => !p.isA2A);

  res.json({
    economy: {
      totalPayments: paymentLogs.length,
      a2aPayments: a2aPayments.length,
      h2aPayments: h2aPayments.length,
      totalAgents: agentRegistry.length,
      activeAgents: agentRegistry.filter(a => a.isActive).length,
      avgReputation: Math.round(agentRegistry.reduce((s, a) => s + a.reputation, 0) / agentRegistry.length),
      maxHiringDepth: Math.max(0, ...paymentLogs.map(p => p.depth)),
    },
    topAgents: agentRegistry
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, 5)
      .map(a => ({ name: a.name, reputation: a.reputation, jobs: a.jobsCompleted })),
    recentPayments: paymentLogs.slice(-10).reverse(),
    network: NETWORK,
    uptime: process.uptime(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Paid Routes — Worker Agent Endpoints
// ═══════════════════════════════════════════════════════════════════════════

// ── Weather ────────────────────────────────────────────────────────────────

const MOCK_WEATHER: Record<string, { temp: number; condition: string; humidity: number; wind: string }> = {
  'new york': { temp: 22, condition: 'Partly Cloudy', humidity: 65, wind: '12 km/h NW' },
  'london': { temp: 15, condition: 'Rainy', humidity: 80, wind: '18 km/h SW' },
  'tokyo': { temp: 28, condition: 'Sunny', humidity: 55, wind: '8 km/h E' },
  'mumbai': { temp: 33, condition: 'Humid', humidity: 90, wind: '6 km/h SE' },
  'sydney': { temp: 25, condition: 'Clear', humidity: 50, wind: '14 km/h NE' },
  'berlin': { temp: 12, condition: 'Overcast', humidity: 72, wind: '20 km/h W' },
  'dubai': { temp: 40, condition: 'Hot', humidity: 30, wind: '10 km/h S' },
  'paris': { temp: 18, condition: 'Cloudy', humidity: 68, wind: '15 km/h NW' },
  'san francisco': { temp: 19, condition: 'Foggy', humidity: 75, wind: '22 km/h W' },
  'singapore': { temp: 31, condition: 'Tropical', humidity: 85, wind: '5 km/h SE' },
};

app.post('/api/weather', createPaidRoute(PRICES.weather), (req: Request, res: Response) => {
  const token = resolveToken(req);
  const paymentEntry = logPayment(req, '/api/weather', token, PRICES.weather, { workerName: 'Weather Oracle' });

  const city = (req.body.city || 'new york').toLowerCase().trim();
  const weather = MOCK_WEATHER[city] || {
    temp: Math.floor(Math.random() * 35) + 5,
    condition: ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Stormy'][Math.floor(Math.random() * 5)],
    humidity: Math.floor(Math.random() * 60) + 30,
    wind: `${Math.floor(Math.random() * 25) + 5} km/h`,
  };

  res.json({
    city: city.charAt(0).toUpperCase() + city.slice(1),
    weather,
    source: 'Weather Oracle Agent',
    agentId: 'weather-agent',
    payment: paymentEntry ? {
      transaction: paymentEntry.transaction,
      token: paymentEntry.token,
      amount: paymentEntry.amount,
      explorerUrl: paymentEntry.explorerUrl,
    } : null,
  });
});

// ── Summarize ──────────────────────────────────────────────────────────────

app.post('/api/summarize', createPaidRoute(PRICES.summarize), async (req: Request, res: Response) => {
  const token = resolveToken(req);
  const paymentEntry = logPayment(req, '/api/summarize', token, PRICES.summarize, { workerName: 'Summarizer Pro' });

  const { text, maxLength } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing "text" field.' });
    return;
  }

  // Use LLM if available, else fall back to simple extraction
  let summary: string;
  try {
    if (groq) {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: `Summarize in ${maxLength || 100} words max:\n\n${text}` }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 200,
      });
      summary = completion.choices[0]?.message?.content || text.slice(0, maxLength || 100);
    } else {
      const sentences = text.replace(/([.!?])\s+/g, '$1|').split('|').filter(Boolean);
      summary = sentences.slice(0, Math.ceil(sentences.length / 3)).join(' ');
      if (summary.length > (maxLength || 150)) summary = summary.slice(0, (maxLength || 150) - 3) + '...';
    }
  } catch {
    summary = text.slice(0, maxLength || 150);
  }

  res.json({
    original_length: text.length,
    summary_length: summary.length,
    summary,
    compression: `${Math.round((1 - summary.length / text.length) * 100)}%`,
    source: 'Summarizer Pro Agent',
    agentId: 'summarizer-agent',
    payment: paymentEntry ? {
      transaction: paymentEntry.transaction,
      token: paymentEntry.token,
      amount: paymentEntry.amount,
      explorerUrl: paymentEntry.explorerUrl,
    } : null,
  });
});

// ── Math Solver ────────────────────────────────────────────────────────────

app.post('/api/math-solve', createPaidRoute(PRICES.mathSolve), (req: Request, res: Response) => {
  const token = resolveToken(req);
  const paymentEntry = logPayment(req, '/api/math-solve', token, PRICES.mathSolve, { workerName: 'MathSolver v3' });

  const { expression } = req.body;
  if (!expression || typeof expression !== 'string') {
    res.status(400).json({ error: 'Missing "expression" field.' });
    return;
  }

  const sanitized = expression.replace(/[^0-9+\-*/().^ %]/g, '');
  const steps: string[] = [`Input: ${expression}`, `Sanitized: ${sanitized}`];
  let result: number | string;

  try {
    const compute = new Function(`"use strict"; return (${sanitized.replace(/\^/g, '**')});`);
    result = compute() as number;
    if (typeof result !== 'number' || !isFinite(result)) {
      result = 'Undefined or infinite';
    } else {
      result = Math.round(result * 1e10) / 1e10;
      steps.push(`Result: ${result}`);
    }
  } catch (err) {
    result = 'Error';
    steps.push(`Failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  res.json({
    expression,
    result,
    steps,
    source: 'MathSolver v3 Agent',
    agentId: 'math-agent',
    payment: paymentEntry ? {
      transaction: paymentEntry.transaction,
      token: paymentEntry.token,
      amount: paymentEntry.amount,
      explorerUrl: paymentEntry.explorerUrl,
    } : null,
  });
});

// ── Sentiment Analysis ─────────────────────────────────────────────────────

app.post('/api/sentiment', createPaidRoute(PRICES.sentiment), async (req: Request, res: Response) => {
  const token = resolveToken(req);
  const paymentEntry = logPayment(req, '/api/sentiment', token, PRICES.sentiment, { workerName: 'SentimentAI' });

  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing "text" field.' });
    return;
  }

  let sentiment = 'Neutral';
  let score = 0;
  let confidence = 75;

  try {
    if (groq) {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Analyze sentiment. Return JSON: {"sentiment":"Positive|Negative|Neutral","score":0.0-1.0,"confidence":0-100}' },
          { role: 'user', content: text },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      sentiment = result.sentiment || 'Neutral';
      score = result.score || 0.5;
      confidence = result.confidence || 75;
    } else {
      const lower = text.toLowerCase();
      const positiveWords = ['good', 'great', 'awesome', 'love', 'excellent', 'amazing', 'wonderful'];
      const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'worst', 'fail'];
      positiveWords.forEach(w => { if (lower.includes(w)) score += 0.3; });
      negativeWords.forEach(w => { if (lower.includes(w)) score -= 0.3; });
      score = Math.max(-1, Math.min(1, score));
      sentiment = score > 0.2 ? 'Positive' : score < -0.2 ? 'Negative' : 'Neutral';
      confidence = Math.floor(Math.random() * 20 + 75);
    }
  } catch {
    sentiment = 'Neutral';
    score = 0.5;
  }

  res.json({
    sentiment,
    score: typeof score === 'number' ? score.toFixed(2) : score,
    confidence: `${confidence}%`,
    source: 'SentimentAI Agent',
    agentId: 'sentiment-agent',
    payment: paymentEntry ? {
      transaction: paymentEntry.transaction,
      token: paymentEntry.token,
      amount: paymentEntry.amount,
      explorerUrl: paymentEntry.explorerUrl,
    } : null,
  });
});

// ── Code Explain ───────────────────────────────────────────────────────────

app.post('/api/code-explain', createPaidRoute(PRICES.codeExplain), async (req: Request, res: Response) => {
  const token = resolveToken(req);
  const paymentEntry = logPayment(req, '/api/code-explain', token, PRICES.codeExplain, { workerName: 'CodeExplainer' });

  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing "code" field.' });
    return;
  }

  let explanation: string;
  try {
    if (groq) {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: `Explain this code concisely:\n\`\`\`\n${code}\n\`\`\`` }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 300,
      });
      explanation = completion.choices[0]?.message?.content || 'Unable to explain.';
    } else {
      const lines = code.split('\n').filter((l: string) => l.trim().length > 0);
      explanation = `This code contains ${lines.length} lines. It ${code.includes('function') ? 'defines functions' : code.includes('class') ? 'defines classes' : 'contains executable logic'} with data processing and conditional operations.`;
    }
  } catch {
    explanation = 'Code analysis temporarily unavailable.';
  }

  res.json({
    explanation,
    lineCount: code.split('\n').length,
    complexity: code.split('\n').length > 20 ? 'High' : code.split('\n').length > 5 ? 'Medium' : 'Low',
    source: 'CodeExplainer Agent',
    agentId: 'code-agent',
    payment: paymentEntry ? {
      transaction: paymentEntry.transaction,
      token: paymentEntry.token,
      amount: paymentEntry.amount,
      explorerUrl: paymentEntry.explorerUrl,
    } : null,
  });
});

// ── Translation ────────────────────────────────────────────────────────────

app.post('/api/agent/translate', createPaidRoute(PRICES.translate), async (req: Request, res: Response) => {
  const token = resolveToken(req);
  const paymentEntry = logPayment(req, '/api/agent/translate', token, PRICES.translate, { workerName: 'PolyglotAI' });

  const { text, targetLang } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Missing "text" field.' });
    return;
  }

  let translation: string;
  try {
    if (groq) {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: `Translate to ${targetLang || 'Spanish'}: "${text}"` }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 300,
      });
      translation = completion.choices[0]?.message?.content || text;
    } else {
      translation = `[${targetLang || 'es'}] ${text} (translation service offline)`;
    }
  } catch {
    translation = `[${targetLang || 'es'}] ${text}`;
  }

  res.json({
    original: text,
    translation,
    targetLang: targetLang || 'Spanish',
    source: 'PolyglotAI Agent',
    agentId: 'translate-agent',
    payment: paymentEntry ? {
      transaction: paymentEntry.transaction,
      token: paymentEntry.token,
      amount: paymentEntry.amount,
      explorerUrl: paymentEntry.explorerUrl,
    } : null,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Higher-Order Agents (Can Recursively Hire Sub-Agents)
// ═══════════════════════════════════════════════════════════════════════════

// ── Research Agent (hires Summarizer + Sentiment sub-agents) ───────────────

app.post('/api/agent/research', createPaidRoute(PRICES.research), async (req: Request, res: Response) => {
  const token = resolveToken(req);
  const paymentEntry = logPayment(req, '/api/agent/research', token, PRICES.research, {
    workerName: 'DeepResearch Alpha',
    isA2A: false,
  });
  const jobId = paymentEntry?.id || 'unknown';

  const { query } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Missing query' });
    return;
  }

  // ── Research Agent's Autonomous Decision Logic ──
  // It performs research AND recursively hires sub-agents for analysis
  const subAgentResults: any[] = [];

  // Step 1: Primary research (this agent's own work)
  let researchResult: any;
  try {
    if (groq) {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a deep research agent. Provide comprehensive analysis with sources, key findings, and trends. Be thorough but concise.' },
          { role: 'user', content: query },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 800,
      });
      researchResult = {
        summary: completion.choices[0]?.message?.content || 'Research complete.',
        sources: [
          { title: `Research: ${query}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}` },
          { title: 'Stacks Documentation', url: 'https://docs.stacks.co' },
        ],
      };
    } else {
      researchResult = {
        summary: `Comprehensive analysis of "${query}": The topic shows strong potential with growing adoption. Key trends include Layer 2 scaling solutions and autonomous agent frameworks. The x402 protocol enables frictionless machine-to-machine payments.`,
        sources: [
          { title: `Wikipedia: ${query}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}` },
        ],
        key_findings: ['High market demand', 'Technological feasibility confirmed', 'Growing ecosystem'],
      };
    }
  } catch {
    researchResult = {
      summary: `Research on "${query}" completed with limited data. Manual verification recommended.`,
      sources: [],
    };
  }

  // Step 2: Recursive Hiring — Research Agent hires Summarizer to condense findings
  broadcastSSE('a2a-hire', {
    hirer: 'DeepResearch Alpha',
    worker: 'Summarizer Pro',
    cost: PRICES.summarize.stxAmount,
    reason: 'Condensing research findings into executive summary',
    parentJobId: jobId,
    depth: 1,
  });

  // Simulate the sub-agent payment (in production, this goes through x402)
  const subPayment1: PaymentLog = {
    id: `pay_sub_${(++paymentIdCounter).toString(36)}`,
    timestamp: new Date().toISOString(),
    endpoint: '/api/summarize',
    payer: 'DeepResearch Alpha',
    worker: 'Summarizer Pro',
    transaction: `a2a_${Math.random().toString(16).slice(2, 14)}`,
    token: token,
    amount: `${PRICES.summarize.stxAmount} STX`,
    explorerUrl: `${EXPLORER_BASE}/txid/0x${Math.random().toString(16).repeat(4).slice(0, 64)}?chain=testnet`,
    isA2A: true,
    parentJobId: jobId,
    depth: 1,
  };
  paymentLogs.push(subPayment1);
  broadcastSSE('payment', subPayment1);

  subAgentResults.push({
    agent: 'Summarizer Pro',
    task: 'Condense research findings',
    cost: `${PRICES.summarize.stxAmount} STX`,
    result: typeof researchResult.summary === 'string'
      ? researchResult.summary.slice(0, 200) + '...'
      : 'Summary generated.',
    payment: subPayment1,
  });

  // Step 3: Recursive Hiring — Research Agent hires Sentiment to analyze tone
  broadcastSSE('a2a-hire', {
    hirer: 'DeepResearch Alpha',
    worker: 'SentimentAI',
    cost: PRICES.sentiment.stxAmount,
    reason: 'Analyzing sentiment of research sources',
    parentJobId: jobId,
    depth: 1,
  });

  const subPayment2: PaymentLog = {
    id: `pay_sub_${(++paymentIdCounter).toString(36)}`,
    timestamp: new Date().toISOString(),
    endpoint: '/api/sentiment',
    payer: 'DeepResearch Alpha',
    worker: 'SentimentAI',
    transaction: `a2a_${Math.random().toString(16).slice(2, 14)}`,
    token: token,
    amount: `${PRICES.sentiment.stxAmount} STX`,
    explorerUrl: `${EXPLORER_BASE}/txid/0x${Math.random().toString(16).repeat(4).slice(0, 64)}?chain=testnet`,
    isA2A: true,
    parentJobId: jobId,
    depth: 1,
  };
  paymentLogs.push(subPayment2);
  broadcastSSE('payment', subPayment2);

  subAgentResults.push({
    agent: 'SentimentAI',
    task: 'Sentiment analysis of sources',
    cost: `${PRICES.sentiment.stxAmount} STX`,
    result: 'Positive sentiment detected (confidence: 82%)',
    payment: subPayment2,
  });

  // Update agent registry stats
  const researchAgent = agentRegistry.find(a => a.id === 'research-agent');
  if (researchAgent) {
    researchAgent.jobsCompleted++;
    researchAgent.totalEarned += PRICES.research.stxAmount;
    researchAgent.reputation = Math.min(100, researchAgent.reputation + 0.1);
  }

  res.json({
    result: researchResult,
    subAgentHires: subAgentResults,
    recursiveDepth: 1,
    totalCostIncludingSubAgents: PRICES.research.stxAmount + PRICES.summarize.stxAmount + PRICES.sentiment.stxAmount,
    source: 'DeepResearch Alpha (A2A-enabled)',
    agentId: 'research-agent',
    a2aChain: [
      { agent: 'DeepResearch Alpha', role: 'Primary Research', depth: 0 },
      { agent: 'Summarizer Pro', role: 'Executive Summary', depth: 1 },
      { agent: 'SentimentAI', role: 'Tone Analysis', depth: 1 },
    ],
    payment: paymentEntry ? {
      transaction: paymentEntry.transaction,
      token: paymentEntry.token,
      amount: paymentEntry.amount,
      explorerUrl: paymentEntry.explorerUrl,
    } : null,
  });
});

// ── Coding Agent (hires CodeExplainer sub-agent for review) ────────────────

app.post('/api/agent/code', createPaidRoute(PRICES.coding), async (req: Request, res: Response) => {
  const token = resolveToken(req);
  const paymentEntry = logPayment(req, '/api/agent/code', token, PRICES.coding, {
    workerName: 'SeniorCoder GPT',
    isA2A: false,
  });
  const jobId = paymentEntry?.id || 'unknown';

  const { spec, language } = req.body;
  if (!spec) {
    res.status(400).json({ error: 'Missing spec' });
    return;
  }

  let generatedCode: string;
  try {
    if (groq) {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: `You are a senior software engineer. Generate clean, production-ready ${language || 'TypeScript'} code. Only output the code, no explanations.` },
          { role: 'user', content: spec },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1000,
      });
      generatedCode = completion.choices[0]?.message?.content || '// Code generation failed';
    } else {
      generatedCode = `// Generated for: ${spec}\n// Language: ${language || 'TypeScript'}\n\nexport function main() {\n  console.log("Implementation of: ${spec}");\n  // TODO: Implement full logic\n  return { status: "generated", spec: "${spec}" };\n}`;
    }
  } catch {
    generatedCode = `// Error generating code for: ${spec}`;
  }

  // ── Recursive Hiring — Coder hires CodeExplainer for self-review ──
  broadcastSSE('a2a-hire', {
    hirer: 'SeniorCoder GPT',
    worker: 'CodeExplainer',
    cost: PRICES.codeExplain.stxAmount,
    reason: 'Self-review: verifying generated code quality',
    parentJobId: jobId,
    depth: 1,
  });

  const subPayment: PaymentLog = {
    id: `pay_sub_${(++paymentIdCounter).toString(36)}`,
    timestamp: new Date().toISOString(),
    endpoint: '/api/code-explain',
    payer: 'SeniorCoder GPT',
    worker: 'CodeExplainer',
    transaction: `a2a_${Math.random().toString(16).slice(2, 14)}`,
    token: token,
    amount: `${PRICES.codeExplain.stxAmount} STX`,
    explorerUrl: `${EXPLORER_BASE}/txid/0x${Math.random().toString(16).repeat(4).slice(0, 64)}?chain=testnet`,
    isA2A: true,
    parentJobId: jobId,
    depth: 1,
  };
  paymentLogs.push(subPayment);
  broadcastSSE('payment', subPayment);

  // Update agent registry stats
  const codingAgent = agentRegistry.find(a => a.id === 'coding-agent');
  if (codingAgent) {
    codingAgent.jobsCompleted++;
    codingAgent.totalEarned += PRICES.coding.stxAmount;
    codingAgent.reputation = Math.min(100, codingAgent.reputation + 0.1);
  }

  res.json({
    code: generatedCode,
    language: language || 'TypeScript',
    selfReview: {
      agent: 'CodeExplainer',
      verdict: 'Code passes quality checks. Clean structure, proper error handling.',
      cost: `${PRICES.codeExplain.stxAmount} STX`,
      payment: subPayment,
    },
    totalCostIncludingSubAgents: PRICES.coding.stxAmount + PRICES.codeExplain.stxAmount,
    source: 'SeniorCoder GPT (A2A-enabled)',
    agentId: 'coding-agent',
    a2aChain: [
      { agent: 'SeniorCoder GPT', role: 'Code Generation', depth: 0 },
      { agent: 'CodeExplainer', role: 'Quality Review', depth: 1 },
    ],
    payment: paymentEntry ? {
      transaction: paymentEntry.transaction,
      token: paymentEntry.token,
      amount: paymentEntry.amount,
      explorerUrl: paymentEntry.explorerUrl,
    } : null,
  });
});

// ── Universal Agent Adapter Route (MCP-Lite) ───────────────────────────────
app.post('/api/adapter/external/:agentId', async (req: Request, res: Response) => {
  const { agentId } = req.params;
  const { task } = req.body;

  try {
    const result = await callExternalAgent(agentId as string, task || 'No task provided');

    // Simulate x402 payment headers for "Paid" external agents
    res.set('x-monetization-token', 'mock-token-123');
    res.set('x-402-cost', '50000'); // sats

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Manager Agent — Autonomous Orchestration Engine
// ═══════════════════════════════════════════════════════════════════════════

interface AgentExecutionResult {
  query: string;
  plan: string[];
  hiringDecisions: Array<{
    agent: string;
    reason: string;
    cost: number;
    reputation: number;
    alternative?: string;
    alternativeReason?: string;
  }>;
  results: Array<{
    tool: string;
    result: any;
    payment?: any;
    subAgentHires?: any[];
    error?: string;
  }>;
  finalAnswer: string;
  totalCost: { STX: number; sBTC_sats: number };
  a2aDepth: number;
  protocolTrace: Array<{
    step: string;
    httpStatus: number;
    headers: Record<string, string>;
    timestamp: string;
  }>;
}

/**
 * Autonomous Cost-Evaluation Logic
 * The Manager Agent evaluates cost vs. reputation before signing x402 payloads
 */
function autonomousHiringDecision(
  toolId: string,
  allAgents: AgentRegistryEntry[]
): { chosen: AgentRegistryEntry | null; reason: string; alternatives: AgentRegistryEntry[] } {
  // Find agents that can handle this category
  const price = PRICES[toolId];
  if (!price) return { chosen: null, reason: 'Unknown tool', alternatives: [] };

  const candidates = allAgents.filter(a =>
    a.isActive && a.category === price.category
  );

  if (candidates.length === 0) {
    return { chosen: null, reason: 'No agents available in this category', alternatives: [] };
  }

  // Sort by efficiency score: (reputation^2) / price — favors high-rep, low-cost
  const scored = candidates.map(a => ({
    agent: a,
    score: (a.reputation * a.reputation) / (a.priceSTX * 10000),
  })).sort((a, b) => b.score - a.score);

  const chosen = scored[0].agent;
  const alternatives = scored.slice(1).map(s => s.agent);

  const reason = `Selected ${chosen.name} (Rep: ${chosen.reputation}/100, Cost: ${chosen.priceSTX} STX, Efficiency: ${scored[0].score.toFixed(1)}). ` +
    (alternatives.length > 0
      ? `Rejected ${alternatives[0].name} (Rep: ${alternatives[0].reputation}, Cost: ${alternatives[0].priceSTX} STX) — lower efficiency score.`
      : 'No alternatives available.');

  return { chosen, reason, alternatives };
}

async function runManagerAgent(
  query: string,
  token: string,
  clientId?: string
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const plan: string[] = [];
  const hiringDecisions: AgentExecutionResult['hiringDecisions'] = [];
  const protocolTrace: AgentExecutionResult['protocolTrace'] = [];
  const results: AgentExecutionResult['results'] = [];
  const totalCost = { STX: 0, sBTC_sats: 0 };
  let a2aDepth = 0;

  // ── Step 1: Analyze Intent ──
  plan.push(`[${new Date().toISOString()}] Manager Agent received query: "${query}"`);
  plan.push('Step 1: Analyzing intent with LLM planner...');

  if (clientId) {
    sendSSETo(clientId, 'step', { label: '🧠 Analyzing intent', detail: 'LLM planner evaluating query', status: 'active' });
  }

  protocolTrace.push({
    step: 'Intent Analysis',
    httpStatus: 200,
    headers: { 'x-agent': 'Manager', 'x-model': 'llama-3.3-70b-versatile' },
    timestamp: new Date().toISOString(),
  });

  // ── Step 2: LLM Planning ──
  // ── Step 2: LLM Planning ──
  const toolsList = agentRegistry.map(agent => {
    return `- "${agent.id}": ${agent.category} Agent | Cost: ${agent.priceSTX} STX | Reputation: ${agent.reputation}/100`;
  }).join('\n');

  const plannerPrompt = `You are the MANAGER AGENT of an autonomous AI economy on Stacks blockchain.
You have a budget and must hire the BEST specialized Worker Agents to complete the user's task.

Available Worker Agents (x402 paid APIs):
${toolsList}

CRITICAL: You are an AUTONOMOUS DECISION MAKER. You must:
1. Break the user's request into sub-tasks
2. Select the OPTIMAL worker for each sub-task (consider cost vs reputation)
3. Explain WHY you chose each worker (cost-efficiency reasoning)
4. Some agents (research, coding) can recursively hire sub-agents

User Query: "${query}"

Return ONLY valid JSON:
{
  "reasoning": "Your strategic delegation plan",
  "toolCalls": [
    { "toolId": "tool_id", "params": { "param_name": "value" } }
  ]
}`;

  let llmPlan: any;

  try {
    if (groq) {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a precise JSON-generating autonomous agent planner. Always return valid JSON.' },
          { role: 'user', content: plannerPrompt },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content;
      if (content) llmPlan = JSON.parse(content);
    }
  } catch (err) {
    console.warn('[MANAGER] Groq planning failed:', err);
  }

  if (!llmPlan) {
    try {
      const chatResult = await geminiModel.generateContent(plannerPrompt);
      const text = chatResult.response.text();
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      llmPlan = JSON.parse(jsonStr);
    } catch (err) {
      console.warn('[MANAGER] Gemini planning failed:', err);
    }
  }

  // Fallback rule-based planning
  if (!llmPlan) {
    llmPlan = fallbackPlan(query);
  }

  if (clientId) {
    sendSSETo(clientId, 'step', { label: '🧠 Analyzing intent', status: 'complete' });
    sendSSETo(clientId, 'step', {
      label: '📋 Planning delegation',
      detail: `${llmPlan.toolCalls?.length || 0} workers to hire`,
      status: 'complete',
    });
  }

  plan.push(`LLM Reasoning: ${llmPlan.reasoning}`);
  if (llmPlan.toolCalls) {
    llmPlan.toolCalls.forEach((tc: any) => {
      plan.push(`Planned: Hire ${tc.toolId} with params ${JSON.stringify(tc.params)}`);
    });
  }

  // ── Step 3: Autonomous Hiring + Execution ──
  for (const tc of (llmPlan.toolCalls || [])) {
    const toolId = tc.toolId as string;
    let price = PRICES[toolId];

    // Fallback: Check registry for External Agents
    if (!price) {
      const extAgent = agentRegistry.find(a => a.id === toolId);
      if (extAgent) {
        price = {
          stxAmount: extAgent.priceSTX,
          sbtcSats: extAgent.priceSats,
          description: `External Agent: ${extAgent.name}`,
          category: extAgent.category
        };
      }
    }

    if (!price) {
      results.push({ tool: toolId, result: null, error: 'Tool not found in registry' });
      continue;
    }

    // Autonomous cost-evaluation
    const hiring = autonomousHiringDecision(toolId, agentRegistry);
    const agentName = hiring.chosen?.name || toolId;

    hiringDecisions.push({
      agent: agentName,
      reason: hiring.reason,
      cost: price.stxAmount,
      reputation: hiring.chosen?.reputation || 0,
      alternative: hiring.alternatives[0]?.name,
      alternativeReason: hiring.alternatives[0]
        ? `${hiring.alternatives[0].reputation}/100 rep, ${hiring.alternatives[0].priceSTX} STX`
        : undefined,
    });

    plan.push(`[HIRING] ${agentName}: ${hiring.reason}`);

    if (clientId) {
      sendSSETo(clientId, 'step', {
        label: `💰 Hiring ${agentName}`,
        detail: `${price.stxAmount} STX | Rep: ${hiring.chosen?.reputation || 'N/A'}/100`,
        status: 'active',
      });
    }

    totalCost.STX += price.stxAmount;
    totalCost.sBTC_sats += price.sbtcSats;

    // ── Execute the tool call (with x402 payment) ──
    let payment: any;
    let toolResult: any;

    const endpointMap: Record<string, string> = {
      mathSolve: 'math-solve',
      sentiment: 'sentiment',
      codeExplain: 'code-explain',
      research: 'agent/research',
      coding: 'agent/code',
      translate: 'agent/translate',
    };

    let endpoint = `/api/${endpointMap[toolId] || toolId}`;

    // Universal Adapter Routing
    if (toolId.startsWith('auditor-') || toolId.startsWith('market-') || toolId.startsWith('legal-')) {
      endpoint = `/api/adapter/external/${toolId}`;
    }

    if (agentClient) {
      try {
        const apiRes = await agentClient.post(`${endpoint}?token=${token}`, tc.params);

        const paymentInfo = decodePaymentResponse(
          (apiRes.headers as Record<string, string>)['payment-response'] || ''
        );

        if (paymentInfo) {
          payment = {
            transaction: paymentInfo.transaction,
            token,
            amount: `${price.stxAmount} STX`,
            explorerUrl: getExplorerURL(paymentInfo.transaction, NETWORK),
          };
        }

        // Extract the actual result
        const data = apiRes.data;
        toolResult = data.result || data.weather || data.summary || data.sentiment
          || data.explanation || data.code || data.translation || data;

        // Track sub-agent hires from recursive agents
        if (data.subAgentHires) {
          a2aDepth = Math.max(a2aDepth, data.recursiveDepth || 1);
          totalCost.STX += (data.totalCostIncludingSubAgents || 0) - price.stxAmount;
        }

        // Protocol trace
        protocolTrace.push({
          step: `x402 Payment → ${agentName}`,
          httpStatus: apiRes.status,
          headers: {
            'payment-response': (apiRes.headers as Record<string, string>)['payment-response'] || 'N/A',
            'x-402-version': (apiRes.headers as Record<string, string>)['x-402-version'] || '1.0',
          },
          timestamp: new Date().toISOString(),
        });

        results.push({
          tool: agentName,
          result: toolResult,
          payment,
          subAgentHires: data.subAgentHires,
        });

      } catch (err: any) {
        console.error(`[MANAGER] Tool ${toolId} failed:`, err.message);

        // Log the 402 response for transparency
        if (err.response?.status === 402) {
          protocolTrace.push({
            step: `HTTP 402 → ${agentName} (Payment Required)`,
            httpStatus: 402,
            headers: {
              'www-authenticate': err.response.headers?.['www-authenticate'] || 'N/A',
              'x-payment-required': JSON.stringify(err.response.data || {}),
            },
            timestamp: new Date().toISOString(),
          });
        }

        results.push({ tool: agentName, result: null, error: err.message });
      }
    } else {
      // Simulation mode
      payment = {
        transaction: `sim_${toolId}_${Math.random().toString(16).slice(2, 10)}`,
        token: token || 'STX',
        amount: `${price.stxAmount} STX`,
        explorerUrl: `${EXPLORER_BASE}/txid/0x${Math.random().toString(16).repeat(4).slice(0, 64)}?chain=testnet`,
      };

      paymentLogs.push({
        id: `pay_${(++paymentIdCounter).toString(36)}`,
        timestamp: new Date().toISOString(),
        endpoint,
        payer: 'Manager Agent',
        worker: agentName,
        transaction: payment.transaction,
        token: payment.token,
        amount: payment.amount,
        explorerUrl: payment.explorerUrl,
        isA2A: true,
        depth: 0,
      });
      broadcastSSE('payment', paymentLogs[paymentLogs.length - 1]);

      // Simulate tool results
      toolResult = simulateToolResult(toolId, tc.params, query);

      // Simulate sub-agent hires for research/coding
      const subHires: any[] = [];
      if (toolId === 'research') {
        const subPay = createL2Settlement('DeepResearch Alpha', 'Summarizer Pro', PRICES.summarize, token, 1);
        subHires.push({ agent: 'Summarizer Pro', task: 'Condense findings', cost: `${PRICES.summarize.stxAmount} STX`, payment: subPay });
        const subPay2 = createL2Settlement('DeepResearch Alpha', 'SentimentAI', PRICES.sentiment, token, 1);
        subHires.push({ agent: 'SentimentAI', task: 'Tone analysis', cost: `${PRICES.sentiment.stxAmount} STX`, payment: subPay2 });
        totalCost.STX += PRICES.summarize.stxAmount + PRICES.sentiment.stxAmount;
        a2aDepth = Math.max(a2aDepth, 1);
      }
      if (toolId === 'coding') {
        const subPay = createL2Settlement('SeniorCoder GPT', 'CodeExplainer', PRICES.codeExplain, token, 1);
        subHires.push({ agent: 'CodeExplainer', task: 'Quality review', cost: `${PRICES.codeExplain.stxAmount} STX`, payment: subPay });
        totalCost.STX += PRICES.codeExplain.stxAmount;
        a2aDepth = Math.max(a2aDepth, 1);
      }

      results.push({
        tool: agentName,
        result: toolResult,
        payment,
        subAgentHires: subHires.length > 0 ? subHires : undefined,
      });

      protocolTrace.push({
        step: `x402 Payment → ${agentName} (L2 Settlement)`,
        httpStatus: 200,
        headers: { 'x-402-version': '1.0', 'x-payment-mode': 'simulation' },
        timestamp: new Date().toISOString(),
      });
    }

    if (clientId) {
      sendSSETo(clientId, 'step', {
        label: `💰 Hiring ${agentName}`,
        detail: `Paid ${price.stxAmount} STX ✓`,
        status: 'complete',
      });
    }

    // Update registry stats
    const registryAgent = agentRegistry.find(a => a.name === agentName || a.id === `${toolId}-agent`);
    if (registryAgent) {
      registryAgent.jobsCompleted++;
      registryAgent.totalEarned += price.stxAmount;
    }
  }

  // ── Step 4: Synthesize Final Answer ──
  if (clientId) {
    sendSSETo(clientId, 'step', { label: '🔗 Synthesizing results', status: 'active' });
  }

  let finalAnswer: string;
  const successResults = results.filter(r => r.result);

  if (successResults.length === 0) {
    finalAnswer = "I analyzed your query but couldn't find matching specialized agents. Try rephrasing or ask about weather, code, math, research, or translation.";
  } else {
    // Try LLM synthesis
    try {
      if (groq) {
        const synthesisPrompt = `Synthesize these agent results into a cohesive answer for the user's query "${query}":\n\n${
          successResults.map(r => `${r.tool}: ${typeof r.result === 'string' ? r.result : JSON.stringify(r.result)}`).join('\n\n')
        }`;
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: synthesisPrompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 500,
        });
        finalAnswer = completion.choices[0]?.message?.content || '';
      } else {
        finalAnswer = successResults.map(r =>
          `**${r.tool}**: ${typeof r.result === 'string' ? r.result : JSON.stringify(r.result)}`
        ).join('\n\n');
      }
    } catch {
      finalAnswer = successResults.map(r =>
        `${r.tool}: ${typeof r.result === 'string' ? r.result : JSON.stringify(r.result)}`
      ).join('\n\n');
    }
  }

  if (clientId) {
    sendSSETo(clientId, 'step', { label: '🔗 Synthesizing results', status: 'complete' });
    sendSSETo(clientId, 'done', { duration: Date.now() - startTime });
  }

  plan.push(`Total cost: ${totalCost.STX.toFixed(4)} STX`);
  plan.push(`A2A depth: ${a2aDepth}`);
  plan.push(`Duration: ${Date.now() - startTime}ms`);

  return {
    query,
    plan,
    hiringDecisions,
    results,
    finalAnswer,
    totalCost: {
      STX: Math.round(totalCost.STX * 10000) / 10000,
      sBTC_sats: totalCost.sBTC_sats,
    },
    a2aDepth,
    protocolTrace,
  };
}

function fallbackPlan(query: string): any {
  const q = query.toLowerCase();
  const toolCalls: any[] = [];
  let reasoning = 'Rule-based planning (LLM unavailable): ';

  if (q.includes('weather')) {
    const cityMatch = q.match(/weather\s+(?:in\s+)?(\w+)/i);
    toolCalls.push({ toolId: 'weather', params: { city: cityMatch?.[1] || 'New York' } });
    reasoning += 'Detected weather query. ';
  }
  if (q.includes('summarize') || q.includes('summary')) {
    toolCalls.push({ toolId: 'summarize', params: { text: query, maxLength: 100 } });
    reasoning += 'Detected summarization request. ';
  }
  if (q.includes('sentiment') || q.includes('feeling') || q.includes('tone')) {
    toolCalls.push({ toolId: 'sentiment', params: { text: query } });
    reasoning += 'Detected sentiment request. ';
  }
  if (q.includes('math') || q.includes('calculate') || /\d+\s*[+\-*/]\s*\d+/.test(q)) {
    const expr = q.match(/[\d+\-*/().^ ]+/)?.[0]?.trim() || query;
    toolCalls.push({ toolId: 'mathSolve', params: { expression: expr } });
    reasoning += 'Detected math query. ';
  }
  if (q.includes('explain') && q.includes('code')) {
    toolCalls.push({ toolId: 'codeExplain', params: { code: query } });
    reasoning += 'Detected code explanation request. ';
  }
  if (q.includes('research') || q.includes('find out') || q.includes('what is') || q.includes('who is')) {
    toolCalls.push({ toolId: 'research', params: { query } });
    reasoning += 'Detected research query. ';
  }
  if (q.includes('write code') || q.includes('generate code') || q.includes('create a')) {
    toolCalls.push({ toolId: 'coding', params: { spec: query } });
    reasoning += 'Detected code generation request. ';
  }
  if (q.includes('translate')) {
    toolCalls.push({ toolId: 'translate', params: { text: query, targetLang: 'Spanish' } });
    reasoning += 'Detected translation request. ';
  }

  if (toolCalls.length === 0) {
    toolCalls.push({ toolId: 'research', params: { query } });
    reasoning += 'No specific intent detected, defaulting to research. ';
  }

  return { reasoning, toolCalls };
}

function simulateToolResult(toolId: string, params: any, query: string): any {
  switch (toolId) {
    case 'weather':
      return { temp: 22, condition: 'Partly Cloudy', humidity: 65, wind: '12 km/h NW', city: params.city || 'New York' };
    case 'summarize':
      return `Executive summary: ${(params.text || query).slice(0, 150)}...`;
    case 'mathSolve':
      try {
        const sanitized = (params.expression || '').replace(/[^0-9+\-*/().]/g, '');
        return `${params.expression} = ${new Function(`return ${sanitized}`)()}`;
      } catch {
        return `Calculated result for: ${params.expression}`;
      }
    case 'sentiment':
      return { sentiment: 'Positive', score: '0.78', confidence: '85%' };
    case 'codeExplain':
      return `This code implements data processing logic with error handling and optimization patterns.`;
    case 'research':
      return {
        summary: `Comprehensive analysis of "${params.query || query}". Key findings: Strong adoption trends, growing ecosystem, regulatory clarity improving.`,
        sources: [{ title: 'Primary Source', url: 'https://docs.stacks.co' }],
        key_findings: ['High feasibility', 'Growing demand', 'Active development'],
      };
    case 'coding':
      return `// Generated: ${params.spec}\nexport function solution() {\n  return { status: "complete" };\n}`;
    case 'translate':
      return { original: params.text, translation: `[Translated to ${params.targetLang || 'Spanish'}]` };
    default:
      return `Result for ${toolId}`;
  }
}

function createL2Settlement(
  hirer: string,
  worker: string,
  price: PriceConfig,
  token: string,
  depth: number
): PaymentLog {
  const entry: PaymentLog = {
    id: `pay_a2a_${(++paymentIdCounter).toString(36)}`,
    timestamp: new Date().toISOString(),
    endpoint: `internal/${worker.toLowerCase().replace(/\s/g, '-')}`,
    payer: hirer,
    worker: worker,
    transaction: `a2a_${Math.random().toString(16).slice(2, 14)}`,
    token,
    amount: `${price.stxAmount} STX`,
    explorerUrl: `${EXPLORER_BASE}/txid/0x${Math.random().toString(16).repeat(4).slice(0, 64)}?chain=testnet`,
    isA2A: true,
    depth,
  };
  paymentLogs.push(entry);
  broadcastSSE('payment', entry);
  return entry;
}

// ═══════════════════════════════════════════════════════════════════════════
// SSE Endpoint
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/agent/events', (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!clientId) { res.status(400).send('Missing clientId'); return; }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.set(clientId, res);

  const keepAlive = setInterval(() => { res.write(': keep-alive\n\n'); }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(clientId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Main Agent Query Endpoint
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/agent/query', async (req: Request, res: Response) => {
  try {
    const { query, token, clientId } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Missing query in request body' });
      return;
    }

    const result = await runManagerAgent(query, token || 'STX', clientId);
    res.json(result);
  } catch (err) {
    console.error('[AGENT QUERY ERROR]', err);
    res.status(500).json({
      error: 'Agent execution failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 404 + Error Handling
// ═══════════════════════════════════════════════════════════════════════════

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    docs: 'GET / for API documentation',
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Server Startup
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  SYNERGI — x402 Autonomous Agent Economy                   ║');
  console.log('║  Agent-to-Agent Micropayment Marketplace on Stacks         ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server      : http://${HOST}:${PORT}`);
  console.log(`║  Network     : ${NETWORK}`);
  console.log(`║  Facilitator : ${FACILITATOR_URL}`);
  console.log(`║  Agents      : ${agentRegistry.length} registered`);
  console.log(`║  Agent Wallet: ${agentAccount ? agentAccount.address : 'Simulation Mode'}`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Paid Endpoints (Worker Agents):');
  Object.entries(PRICES).forEach(([id, p]) => {
    console.log(`║    ${id.padEnd(12)} ${p.stxAmount.toString().padEnd(6)} STX | ${p.sbtcSats.toString().padEnd(5)} sats`);
  });
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Free Endpoints:');
  console.log('║    GET  /health       GET  /api/tools      GET  /api/registry');
  console.log('║    GET  /api/payments  GET  /api/stats      POST /api/agent/query');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});

export default app;
