/**
 * x402 Autonomous Agent
 *
 * An AI agent that:
 * 1. Discovers available paid tools from the backend
 * 2. Accepts a user query
 * 3. Plans which tools to call using an LLM (Groq supported)
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
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: '../.env' });
dotenv.config();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:3001';
const NETWORK = (process.env.NETWORK as 'testnet' | 'mainnet') || 'testnet';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

// Initialize AI clients
let groqClient: Groq | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

if (GROQ_API_KEY) {
  groqClient = new Groq({ apiKey: GROQ_API_KEY });
}
if (GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

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
// Planner — LLM-based
// ---------------------------------------------------------------------------

async function planToolCalls(query: string, tools: Tool[]): Promise<AgentPlan> {
  const toolsDescription = tools
    .map(
      (t) =>
        `- ID: "${t.id}"\n  Description: ${t.description}\n  Params: ${JSON.stringify(t.params)}`
    )
    .join('\n\n');

  const systemPrompt = `
You are an autonomous AI agent capable of using paid tools to answer user queries.
You have a budget and should only call tools if necessary.

Available Tools:
${toolsDescription}

Instructions:
1. Analyze the user's query.
2. Decide which tools (if any) are needed to answer it.
3. If multiple tools are needed, list them in logical order (e.g., get weather -> summarize).
4. Extract necessary parameters for each tool call from the query.
5. Provide a short reasoning for your plan.

Output Format:
Return a valid JSON object with this exact structure:
{
  "reasoning": "Explanation of why you selected these tools (or none).",
  "toolCalls": [
    {
      "toolId": "tool_id_from_list",
      "params": { "param_name": "value" }
    }
  ]
}

If no tools are needed (e.g., general knowledge or greeting), return empty toolCalls.
Do NOT output markdown code blocks. Just the raw JSON.
`;

  console.log('[AGENT] Planning with LLM...');

  try {
    // Try Groq first
    if (groqClient) {
      const completion = await groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content) as AgentPlan;
      }
    }

    // Fallback to Gemini
    if (geminiClient) {
      const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(
        systemPrompt + '\n\nUser Query: ' + query
      );
      const text = result.response.text();
      // Gemini might wrap in markdown blocks, strip them
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr) as AgentPlan;
    }

    throw new Error('No LLM client available (GROQ_API_KEY or GEMINI_API_KEY missing)');
  } catch (err) {
    console.error('[AGENT] Planning failed, falling back to rule-based:', err);
    return fallbackRuleBasedPlan(query, tools);
  }
}

function fallbackRuleBasedPlan(query: string, tools: Tool[]): AgentPlan {
  const q = query.toLowerCase();
  const plan: AgentPlan = { query, toolCalls: [], reasoning: 'Fallback rule-based plan.' };

  // Simple keyword matching as fallback
  if (q.includes('weather')) {
    const cityBase = q.split('weather')[1]?.trim() || 'New York';
    // quick cleanup
    const city = cityBase.split(' ')[0] || 'New York';
    plan.toolCalls.push({ toolId: 'weather', params: { city } });
  }

  if (q.includes('summarize')) {
     plan.toolCalls.push({ toolId: 'summarize', params: { text: query, maxLength: 50 } });
  }

  // Sentiment
  if (q.includes('sentiment') || q.includes('feeling')) {
    plan.toolCalls.push({ toolId: 'sentiment', params: { text: query } });
  }

  // Code explainer
  if (q.includes('explain code') || q.includes('what does this code')) {
    // extract code block loosely
    const code = query.replace(/explain code/i, '').trim();
    plan.toolCalls.push({ toolId: 'code-explain', params: { code } });
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
  const plan = await planToolCalls(query, availableTools);
  console.log(`[AGENT] Plan: ${plan.reasoning}`);
  console.log(
    `[AGENT] Tools to call: ${plan.toolCalls.length > 0 ? plan.toolCalls.map((c) => c.toolId).join(' → ') : 'none'}`
  );

  if (plan.toolCalls.length === 0) {
    return {
      query,
      plan,
      results: [],
      finalAnswer: plan.reasoning || 'No tools needed to answer this query.',
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

  // Simple aggregation for now
  // Ideally, this would be another LLM call to synthesize the answer
  const parts: string[] = [];

  for (const result of successful) {
    if (result.data) {
        // Try to find a meaningful string representation
        const content = result.data.answer || result.data.summary || result.data.result || JSON.stringify(result.data);
        parts.push(`${result.tool}: ${JSON.stringify(content)}`);
    }
  }

  return parts.join('\n\n') || 'Tools executed successfully.';
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

      if (['exit', 'quit'].includes(trimmed)) {
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
