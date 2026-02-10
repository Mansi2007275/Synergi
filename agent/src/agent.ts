/**
 * x402 Autonomous Agent
 *
 * An AI agent that:
 * 1. Discovers available paid tools from the backend
 * 2. Accepts a user query
 * 3. Plans which tools to call (rule-based or LLM)
 * 4. Automatically pays for each tool via x402 (STX/sBTC)
 * 5. Aggregates results into a final answer
 *
 * This demonstrates machine-to-machine micropayments on Stacks —
 * the core vision of the x402 protocol.
 */

import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import {
  wrapAxiosWithPayment,
  privateKeyToAccount,
  decodePaymentResponse,
  getExplorerURL,
} from 'x402-stacks';
import * as readline from 'readline';

dotenv.config({ path: '../.env' });
dotenv.config();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:3001';
const NETWORK = (process.env.NETWORK as 'testnet' | 'mainnet') || 'testnet';

if (!PRIVATE_KEY) {
  console.error(
    '[AGENT] AGENT_PRIVATE_KEY not set. Run: npx tsx src/generate-wallet.ts'
  );
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY, NETWORK);
const api: AxiosInstance = wrapAxiosWithPayment(
  axios.create({ baseURL: SERVER_URL }),
  account
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tool {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  price: { STX: number; sBTC_sats: number };
  params: Record<string, string>;
  description: string;
}

interface ToolCallResult {
  tool: string;
  success: boolean;
  data: any;
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
  toolCalls: { toolId: string; params: Record<string, any> }[];
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Tool Discovery
// ---------------------------------------------------------------------------

let availableTools: Tool[] = [];

async function discoverTools(): Promise<Tool[]> {
  console.log('[AGENT] Discovering available tools...');
  try {
    const res = await axios.get(`${SERVER_URL}/api/tools`);
    availableTools = res.data.tools;
    console.log(
      `[AGENT] Found ${availableTools.length} tools:`,
      availableTools.map((t) => `${t.id} (${t.price.STX} STX)`).join(', ')
    );
    return availableTools;
  } catch (err) {
    console.error('[AGENT] Tool discovery failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Planner — Rule-based (swap with LLM for smarter planning)
// ---------------------------------------------------------------------------

function planToolCalls(query: string): AgentPlan {
  const q = query.toLowerCase();
  const plan: AgentPlan = { query, toolCalls: [], reasoning: '' };

  // Weather detection
  const weatherMatch = q.match(
    /weather\s+(?:in|for|at)\s+([a-z\s]+?)(?:\?|$|,|\s+and\s+)/
  );
  if (q.includes('weather') || weatherMatch) {
    const city = weatherMatch?.[1]?.trim() || 'new york';
    plan.toolCalls.push({ toolId: 'weather', params: { city } });
    plan.reasoning += `Detected weather query for "${city}". `;
  }

  // Summarize detection
  if (
    q.includes('summarize') ||
    q.includes('summary') ||
    q.includes('tldr') ||
    q.includes('shorten')
  ) {
    const textMatch = query.match(/(?:summarize|summary of|tldr|shorten)\s*:?\s*(.+)/i);
    const text = textMatch?.[1]?.trim() || query;
    plan.toolCalls.push({ toolId: 'summarize', params: { text, maxLength: 100 } });
    plan.reasoning += 'Detected summarization request. ';
  }

  // Math detection
  const mathPatterns = /(\d+\s*[+\-*/^%]\s*\d+|calculate|compute|solve|math|equation)/;
  if (mathPatterns.test(q)) {
    const exprMatch = query.match(
      /(?:calculate|compute|solve|what is|evaluate)?\s*:?\s*([\d\s+\-*/().^%]+)/i
    );
    const expression = exprMatch?.[1]?.trim() || query;
    plan.toolCalls.push({ toolId: 'math-solve', params: { expression } });
    plan.reasoning += `Detected math expression: "${expression}". `;
  }

  // Multi-tool: if query mentions multiple things
  if (plan.toolCalls.length === 0) {
    plan.reasoning =
      'No matching tools found. Try asking about weather, summarization, or math.';
  } else if (plan.toolCalls.length > 1) {
    plan.reasoning += `Multi-tool chain: calling ${plan.toolCalls.length} tools sequentially.`;
  }

  return plan;
}

// ---------------------------------------------------------------------------
// Tool Executor
// ---------------------------------------------------------------------------

async function executeTool(
  toolId: string,
  params: Record<string, any>,
  token: 'STX' | 'sBTC' = 'STX'
): Promise<ToolCallResult> {
  const tool = availableTools.find((t) => t.id === toolId);
  if (!tool) {
    return {
      tool: toolId,
      success: false,
      data: null,
      error: `Tool "${toolId}" not found`,
    };
  }

  console.log(
    `[AGENT] Calling ${tool.name} (${tool.price.STX} STX)...`
  );

  try {
    const res = await api.post(`${tool.endpoint}?token=${token}`, params);

    const paymentInfo = decodePaymentResponse(
      (res.headers as Record<string, string>)['payment-response'] || ''
    );

    const result: ToolCallResult = {
      tool: tool.name,
      success: true,
      data: res.data,
    };

    if (paymentInfo) {
      result.payment = {
        transaction: paymentInfo.transaction,
        token,
        amount: `${tool.price.STX} STX`,
        explorerUrl: getExplorerURL(paymentInfo.transaction, NETWORK),
      };
      console.log(`[AGENT] Paid ${tool.price.STX} STX | tx: ${paymentInfo.transaction}`);
    }

    return result;
  } catch (err: any) {
    const status = err.response?.status;
    const errData = err.response?.data;
    console.error(`[AGENT] Tool ${toolId} failed (${status}):`, errData || err.message);
    return {
      tool: tool.name,
      success: false,
      data: null,
      error: `HTTP ${status}: ${JSON.stringify(errData) || err.message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Agent Orchestrator
// ---------------------------------------------------------------------------

async function processQuery(
  query: string,
  token: 'STX' | 'sBTC' = 'STX'
): Promise<{
  query: string;
  plan: AgentPlan;
  results: ToolCallResult[];
  finalAnswer: string;
  totalCost: number;
}> {
  console.log('');
  console.log('----------------------------------------------------------------');
  console.log(`[AGENT] Processing: "${query}"`);
  console.log('----------------------------------------------------------------');

  // 1. Plan
  const plan = planToolCalls(query);
  console.log(`[AGENT] Plan: ${plan.reasoning}`);
  console.log(
    `[AGENT] Tools to call: ${plan.toolCalls.map((c) => c.toolId).join(' → ') || 'none'}`
  );

  if (plan.toolCalls.length === 0) {
    return {
      query,
      plan,
      results: [],
      finalAnswer: plan.reasoning,
      totalCost: 0,
    };
  }

  // 2. Execute sequentially (each auto-pays via x402)
  const results: ToolCallResult[] = [];
  let totalCost = 0;

  for (const call of plan.toolCalls) {
    const result = await executeTool(call.toolId, call.params, token);
    results.push(result);

    if (result.success) {
      const tool = availableTools.find((t) => t.id === call.toolId);
      totalCost += tool?.price.STX || 0;
    }
  }

  // 3. Aggregate into final answer
  const finalAnswer = aggregateResults(query, results);

  console.log('');
  console.log(`[AGENT] Total cost: ${totalCost} STX`);
  console.log(`[AGENT] Final answer: ${finalAnswer}`);

  return { query, plan, results, finalAnswer, totalCost };
}

function aggregateResults(query: string, results: ToolCallResult[]): string {
  const successful = results.filter((r) => r.success);

  if (successful.length === 0) {
    return 'All tool calls failed. Please check connectivity and wallet balance.';
  }

  const parts: string[] = [];

  for (const result of successful) {
    if (result.data?.weather) {
      const w = result.data.weather;
      parts.push(
        `Weather in ${result.data.city}: ${w.temp} C, ${w.condition}, humidity ${w.humidity}%, wind ${w.wind}`
      );
    }
    if (result.data?.summary) {
      parts.push(`Summary: ${result.data.summary}`);
    }
    if (result.data?.result !== undefined) {
      parts.push(
        `Math result: ${result.data.expression} = ${result.data.result}`
      );
    }
  }

  return parts.join(' | ') || 'Tools executed successfully.';
}

// ---------------------------------------------------------------------------
// Interactive REPL
// ---------------------------------------------------------------------------

async function startRepl() {
  console.log('');
  console.log('================================================================');
  console.log('  x402 AUTONOMOUS AGENT');
  console.log('================================================================');
  console.log(`  Server  : ${SERVER_URL}`);
  console.log(`  Wallet  : ${account.address}`);
  console.log(`  Network : ${NETWORK}`);
  console.log('================================================================');
  console.log('');
  console.log('  Commands:');
  console.log('    Type a query → agent plans + pays + executes');
  console.log('    "tools"      → list available tools + pricing');
  console.log('    "payments"   → show payment log');
  console.log('    "demo"       → run a demo multi-tool query');
  console.log('    "exit"       → quit');
  console.log('');

  // Discover tools first
  await discoverTools();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question('\n[AGENT] > ', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === 'exit' || trimmed === 'quit') {
        console.log('[AGENT] Shutting down.');
        rl.close();
        process.exit(0);
      }

      if (trimmed === 'tools') {
        console.log('\nAvailable Tools:');
        for (const t of availableTools) {
          console.log(
            `  ${t.id.padEnd(15)} ${t.price.STX} STX  — ${t.description}`
          );
        }
        prompt();
        return;
      }

      if (trimmed === 'payments') {
        try {
          const res = await axios.get(`${SERVER_URL}/api/payments`);
          console.log('\nPayment Log:', JSON.stringify(res.data, null, 2));
        } catch {
          console.log('Failed to fetch payments.');
        }
        prompt();
        return;
      }

      if (trimmed === 'demo') {
        console.log('[AGENT] Running demo: multi-tool query...');
        await processQuery(
          'What is the weather in Tokyo and calculate 42 * 3 + 100 / 4 - 7'
        );
        prompt();
        return;
      }

      // Process as natural language query
      await processQuery(trimmed);
      prompt();
    });
  };

  prompt();
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

// If no args → start REPL, if args → one-shot query
const queryArg = process.argv.slice(2).join(' ');

if (queryArg) {
  (async () => {
    await discoverTools();
    const result = await processQuery(queryArg);
    console.log('\n[RESULT]', JSON.stringify(result, null, 2));
  })();
} else {
  startRepl();
}
