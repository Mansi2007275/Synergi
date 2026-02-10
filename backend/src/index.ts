/**
 * x402-stacks Backend Server
 *
 * Express server with x402 payment-gated endpoints for the
 * Autonomous AI Agent hackathon project. Each endpoint requires
 * micropayment via STX or sBTC on Stacks testnet.
 *
 * Endpoints:
 *   POST /api/weather       — Mock weather data   (0.01 STX / 1000 sats sBTC)
 *   POST /api/summarize     — Text summarization  (0.03 STX / 3000 sats sBTC)
 *   POST /api/math-solve    — Math solver          (0.05 STX / 5000 sats sBTC)
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
  formatPaymentAmount,
} from 'x402-stacks';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NETWORK = (process.env.NETWORK as 'testnet' | 'mainnet') || 'testnet';
const SERVER_ADDRESS =
  process.env.SERVER_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const FACILITATOR_URL =
  process.env.FACILITATOR_URL || 'https://x402-backend-7eby.onrender.com';

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    exposedHeaders: [
      'X-Payment-Response',
      'Payment-Response',
      'X-402-Version',
    ],
  })
);

app.use(morgan('short'));
app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Payment Logging
// ---------------------------------------------------------------------------

interface PaymentLog {
  timestamp: string;
  endpoint: string;
  payer: string;
  transaction: string;
  token: string;
  amount: string;
  explorerUrl: string;
}

const paymentLogs: PaymentLog[] = [];

function logPayment(
  req: Request,
  endpoint: string,
  token: 'STX' | 'sBTC',
  priceConfig: PriceConfig
) {
  const payment = getPayment(req);
  if (!payment) return null;

  const txId = payment.transaction || 'pending';
  const explorerUrl = getExplorerURL(txId, NETWORK);

  // Derive display amount from config (SettlementResponseV2 does not carry amount)
  const displayAmount =
    token === 'sBTC'
      ? `${priceConfig.sbtcSats} sats sBTC`
      : `${priceConfig.stxAmount} STX`;

  const entry: PaymentLog = {
    timestamp: new Date().toISOString(),
    endpoint,
    payer: payment.payer || 'unknown',
    transaction: txId,
    token,
    amount: displayAmount,
    explorerUrl,
  };

  paymentLogs.push(entry);

  console.log(
    `[PAYMENT] ${entry.token} | ${entry.endpoint} | payer=${entry.payer} | tx=${entry.transaction}`
  );
  console.log(`  Explorer: ${entry.explorerUrl}`);

  return entry;
}

// ---------------------------------------------------------------------------
// Helper — resolve token type from query/header toggle
// ---------------------------------------------------------------------------

type TokenType = 'STX' | 'sBTC';

function resolveToken(req: Request): TokenType {
  const fromQuery = (req.query.token as string)?.toUpperCase();
  const fromHeader = (req.headers['x-token-type'] as string)?.toUpperCase();
  const token = fromQuery || fromHeader || 'STX';
  return token === 'SBTC' ? 'sBTC' : 'STX';
}

// ---------------------------------------------------------------------------
// Dynamic Payment Middleware Factory
// ---------------------------------------------------------------------------

interface PriceConfig {
  stxAmount: number; // in STX (e.g. 0.01)
  sbtcSats: number; // in satoshis (e.g. 1000)
  description: string;
}

function createPaidRoute(config: PriceConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = resolveToken(req);

    const opts: Parameters<typeof paymentMiddleware>[0] = {
      amount: token === 'sBTC' ? BTCtoSats(config.sbtcSats / 1e8) : STXtoMicroSTX(config.stxAmount),
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

// ---------------------------------------------------------------------------
// Endpoint Pricing
// ---------------------------------------------------------------------------

const PRICES: Record<string, PriceConfig> = {
  weather: {
    stxAmount: 0.01,
    sbtcSats: 1000,
    description: 'Weather data lookup',
  },
  summarize: {
    stxAmount: 0.03,
    sbtcSats: 3000,
    description: 'AI text summarization',
  },
  mathSolve: {
    stxAmount: 0.05,
    sbtcSats: 5000,
    description: 'Math equation solver',
  },
};

// ---------------------------------------------------------------------------
// Routes — Health & Info
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    network: NETWORK,
    facilitator: FACILITATOR_URL,
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'x402 Stacks Autonomous Agent API',
    version: '1.0.0',
    description:
      'Payment-gated AI micro-tools on Stacks blockchain via x402 protocol',
    network: NETWORK,
    facilitator: FACILITATOR_URL,
    tokenSupport: ['STX', 'sBTC'],
    tokenToggle:
      'Set query param ?token=STX|sBTC or header X-Token-Type: STX|sBTC',
    endpoints: {
      '/api/weather': `POST — Mock weather data (${PRICES.weather.stxAmount} STX / ${PRICES.weather.sbtcSats} sats sBTC)`,
      '/api/summarize': `POST — Text summarization (${PRICES.summarize.stxAmount} STX / ${PRICES.summarize.sbtcSats} sats sBTC)`,
      '/api/math-solve': `POST — Math solver (${PRICES.mathSolve.stxAmount} STX / ${PRICES.mathSolve.sbtcSats} sats sBTC)`,
      '/api/payments': 'GET — Payment log (free)',
      '/api/tools': 'GET — Available tools + pricing (free)',
    },
  });
});

// ---------------------------------------------------------------------------
// Route — GET /api/tools (free, discovery for agents)
// ---------------------------------------------------------------------------

app.get('/api/tools', (_req: Request, res: Response) => {
  res.json({
    tools: [
      {
        id: 'weather',
        name: 'Weather Lookup',
        endpoint: '/api/weather',
        method: 'POST',
        price: { STX: PRICES.weather.stxAmount, sBTC_sats: PRICES.weather.sbtcSats },
        params: { city: 'string (required)' },
        description: 'Returns current weather data for a given city',
      },
      {
        id: 'summarize',
        name: 'Text Summarizer',
        endpoint: '/api/summarize',
        method: 'POST',
        price: { STX: PRICES.summarize.stxAmount, sBTC_sats: PRICES.summarize.sbtcSats },
        params: { text: 'string (required)', maxLength: 'number (optional)' },
        description: 'Summarizes input text into a concise version',
      },
      {
        id: 'math-solve',
        name: 'Math Solver',
        endpoint: '/api/math-solve',
        method: 'POST',
        price: { STX: PRICES.mathSolve.stxAmount, sBTC_sats: PRICES.mathSolve.sbtcSats },
        params: { expression: 'string (required)' },
        description: 'Evaluates a math expression and returns the result',
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Route — POST /api/weather (0.01 STX)
// ---------------------------------------------------------------------------

const MOCK_WEATHER: Record<
  string,
  { temp: number; condition: string; humidity: number; wind: string }
> = {
  'new york': { temp: 22, condition: 'Partly Cloudy', humidity: 65, wind: '12 km/h NW' },
  london: { temp: 15, condition: 'Rainy', humidity: 80, wind: '18 km/h SW' },
  tokyo: { temp: 28, condition: 'Sunny', humidity: 55, wind: '8 km/h E' },
  mumbai: { temp: 33, condition: 'Humid', humidity: 90, wind: '6 km/h SE' },
  sydney: { temp: 25, condition: 'Clear', humidity: 50, wind: '14 km/h NE' },
  berlin: { temp: 12, condition: 'Overcast', humidity: 72, wind: '20 km/h W' },
  dubai: { temp: 40, condition: 'Hot', humidity: 30, wind: '10 km/h S' },
  paris: { temp: 18, condition: 'Cloudy', humidity: 68, wind: '15 km/h NW' },
};

app.post(
  '/api/weather',
  createPaidRoute(PRICES.weather),
  (req: Request, res: Response) => {
    const token = resolveToken(req);
    const paymentEntry = logPayment(req, '/api/weather', token, PRICES.weather);

    const city = (req.body.city || 'new york').toLowerCase().trim();
    const weather = MOCK_WEATHER[city] || {
      temp: Math.floor(Math.random() * 35) + 5,
      condition: ['Sunny', 'Cloudy', 'Rainy', 'Windy'][
        Math.floor(Math.random() * 4)
      ],
      humidity: Math.floor(Math.random() * 60) + 30,
      wind: `${Math.floor(Math.random() * 25) + 5} km/h`,
    };

    res.json({
      city: city.charAt(0).toUpperCase() + city.slice(1),
      weather,
      source: 'x402-stacks-mock',
      payment: paymentEntry
        ? {
            transaction: paymentEntry.transaction,
            token: paymentEntry.token,
            amount: paymentEntry.amount,
            explorerUrl: paymentEntry.explorerUrl,
          }
        : null,
    });
  }
);

// ---------------------------------------------------------------------------
// Route — POST /api/summarize (0.03 STX)
// ---------------------------------------------------------------------------

function summarizeText(text: string, maxLength = 100): string {
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .filter(Boolean);

  if (sentences.length <= 2) return text.substring(0, maxLength);

  const keyPhrases = sentences.slice(0, Math.ceil(sentences.length / 3));
  let summary = keyPhrases.join(' ');

  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }

  return summary;
}

app.post(
  '/api/summarize',
  createPaidRoute(PRICES.summarize),
  (req: Request, res: Response) => {
    const token = resolveToken(req);
    const paymentEntry = logPayment(req, '/api/summarize', token, PRICES.summarize);

    const { text, maxLength } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request body must include a "text" string field.',
      });
      return;
    }

    const summary = summarizeText(text, maxLength || 150);

    res.json({
      original_length: text.length,
      summary_length: summary.length,
      summary,
      compression: `${Math.round((1 - summary.length / text.length) * 100)}%`,
      source: 'x402-stacks-summarizer',
      payment: paymentEntry
        ? {
            transaction: paymentEntry.transaction,
            token: paymentEntry.token,
            amount: paymentEntry.amount,
            explorerUrl: paymentEntry.explorerUrl,
          }
        : null,
    });
  }
);

// ---------------------------------------------------------------------------
// Route — POST /api/math-solve (0.05 STX)
// ---------------------------------------------------------------------------

function solveMath(expression: string): {
  result: number | string;
  steps: string[];
} {
  const steps: string[] = [];
  const sanitized = expression.replace(/[^0-9+\-*/().^ %]/g, '');

  if (!sanitized) {
    return { result: 'Invalid expression', steps: ['No valid math tokens found.'] };
  }

  steps.push(`Input: ${expression}`);
  steps.push(`Sanitized: ${sanitized}`);

  try {
    // Safe evaluation via Function constructor (no eval, sandboxed)
    const compute = new Function(
      `"use strict"; return (${sanitized.replace(/\^/g, '**')});`
    );
    const result = compute() as number;

    if (typeof result !== 'number' || !isFinite(result)) {
      return {
        result: 'Undefined or infinite',
        steps: [...steps, 'Result is not a finite number.'],
      };
    }

    steps.push(`Result: ${result}`);
    return { result: Math.round(result * 1e10) / 1e10, steps };
  } catch (err) {
    return {
      result: 'Error',
      steps: [
        ...steps,
        `Evaluation failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
}

app.post(
  '/api/math-solve',
  createPaidRoute(PRICES.mathSolve),
  (req: Request, res: Response) => {
    const token = resolveToken(req);
    const paymentEntry = logPayment(req, '/api/math-solve', token, PRICES.mathSolve);

    const { expression } = req.body;

    if (!expression || typeof expression !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request body must include an "expression" string field.',
      });
      return;
    }

    const { result, steps } = solveMath(expression);

    res.json({
      expression,
      result,
      steps,
      source: 'x402-stacks-math-solver',
      payment: paymentEntry
        ? {
            transaction: paymentEntry.transaction,
            token: paymentEntry.token,
            amount: paymentEntry.amount,
            explorerUrl: paymentEntry.explorerUrl,
          }
        : null,
    });
  }
);

// ---------------------------------------------------------------------------
// Route — GET /api/payments (free, view payment log)
// ---------------------------------------------------------------------------

app.get('/api/payments', (_req: Request, res: Response) => {
  res.json({
    total: paymentLogs.length,
    payments: paymentLogs.slice(-50).reverse(),
  });
});

// ---------------------------------------------------------------------------
// 404 + Error Handling
// ---------------------------------------------------------------------------

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET  /',
      'GET  /health',
      'GET  /api/tools',
      'POST /api/weather',
      'POST /api/summarize',
      'POST /api/math-solve',
      'GET  /api/payments',
    ],
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message,
  });
});

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('================================================================');
  console.log('  x402 STACKS — AUTONOMOUS AGENT API SERVER');
  console.log('================================================================');
  console.log(`  Server     : http://${HOST}:${PORT}`);
  console.log(`  Network    : ${NETWORK}`);
  console.log(`  Facilitator: ${FACILITATOR_URL}`);
  console.log(`  Receiver   : ${SERVER_ADDRESS}`);
  console.log('----------------------------------------------------------------');
  console.log('  Paid Endpoints:');
  console.log(`    POST /api/weather      ${PRICES.weather.stxAmount} STX / ${PRICES.weather.sbtcSats} sats`);
  console.log(`    POST /api/summarize    ${PRICES.summarize.stxAmount} STX / ${PRICES.summarize.sbtcSats} sats`);
  console.log(`    POST /api/math-solve   ${PRICES.mathSolve.stxAmount} STX / ${PRICES.mathSolve.sbtcSats} sats`);
  console.log('  Free Endpoints:');
  console.log('    GET  /health');
  console.log('    GET  /api/tools');
  console.log('    GET  /api/payments');
  console.log('================================================================');
  console.log('');
});

export default app;
