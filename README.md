# x402 Autonomous Agent — Stacks Micropayments

> **Machine-to-machine micropayments on Bitcoin, powered by the x402 protocol and Stacks.**

An autonomous AI agent that **discovers**, **plans**, **pays for**, and **aggregates** results from paid API endpoints — all without human intervention. Every API call triggers an automatic STX or sBTC micropayment settled on the Stacks blockchain.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   USER / FRONTEND                   │
│              (query → agent → answer)               │
└──────────────────────┬──────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │   AUTONOMOUS AGENT  │
            │                     │
            │  1. Discover tools  │
            │  2. Plan calls      │
            │  3. Auto-pay (x402) │
            │  4. Aggregate       │
            └──────────┬──────────┘
                       │  HTTP 402 → pay → retry
            ┌──────────▼──────────┐
            │   BACKEND SERVER    │
            │                     │
            │  /api/weather       │  0.001 STX
            │  /api/summarize     │  0.002 STX
            │  /api/math-solve    │  0.001 STX
            └──────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │   x402 FACILITATOR  │
            │  (testnet)          │
            │  Settlement on      │
            │  Stacks blockchain  │
            └─────────────────────┘
```

## How x402 Works

1. Agent calls a paid endpoint
2. Server responds with **HTTP 402 Payment Required** + payment details
3. `x402-stacks` client wrapper **automatically** signs a payment
4. Payment is settled via the **facilitator** on the Stacks blockchain
5. Server returns the API response with a `payment-response` header
6. Agent extracts the transaction hash and links to the Stacks Explorer

**Zero human intervention. Zero browser popups. Pure machine-to-machine payments.**

---

## Project Structure

```
stacks-x402-challenge/
├── backend/                 # Express server with x402-protected endpoints
│   └── src/index.ts         # 3 paid APIs + free discovery/health endpoints
├── agent/                   # Autonomous agent client
│   └── src/
│       ├── agent.ts         # Core agent: plan → pay → execute → aggregate
│       ├── test-client.ts   # Manual endpoint test script
│       └── generate-wallet.ts  # Testnet wallet generator
├── .env.example             # Environment variable template
├── package.json             # Monorepo root (npm workspaces)
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- A Stacks testnet wallet with STX (get testnet STX from the [Stacks faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet))

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/stacks-x402-challenge.git
cd stacks-x402-challenge
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
#   SERVER_ADDRESS  — your Stacks testnet address (receives payments)
#   AGENT_PRIVATE_KEY — agent wallet private key (sends payments)
```

**Generate a fresh agent wallet:**

```bash
npm run agent:wallet
```

### 3. Start the Backend

```bash
npm run backend:dev
```

Server starts on `http://localhost:3001` with 3 paid endpoints and free discovery.

### 4. Run the Agent

**Interactive REPL:**

```bash
npm run agent:start
```

**One-shot query:**

```bash
npx tsx agent/src/agent.ts "What is the weather in Tokyo?"
```

---

## Demo Scenarios

```bash
# Single tool
> What is the weather in San Francisco?

# Math
> Calculate 42 * 3 + 100 / 4 - 7

# Summarize
> Summarize: The x402 protocol enables machine-to-machine payments...

# Multi-tool chain (auto-pays for each)
> What is the weather in Tokyo and calculate 42 * 3
```

Each query triggers:

- **Tool discovery** → reads `/api/tools`
- **Planning** → matches tools via rule-based NLP
- **Payment** → `x402-stacks` handles the 402 flow automatically
- **Aggregation** → combines results into a single answer

---

## Endpoints

| Endpoint              | Method | Price     | Auth |
| --------------------- | ------ | --------- | ---- |
| `/api/weather`        | POST   | 0.001 STX | x402 |
| `/api/summarize-text` | POST   | 0.002 STX | x402 |
| `/api/math-solve`     | POST   | 0.001 STX | x402 |
| `/api/tools`          | GET    | Free      | None |
| `/api/payments`       | GET    | Free      | None |
| `/health`             | GET    | Free      | None |

**Token toggle:** Append `?token=sBTC` to pay with sBTC instead of STX.

---

## x402-stacks SDK Integration

This project uses the following SDK features:

| Feature                       | Usage                                   |
| ----------------------------- | --------------------------------------- |
| `paymentMiddleware`           | Protects endpoints with 402 responses   |
| `wrapAxiosWithPayment`        | Auto-pays 402 responses on the client   |
| `privateKeyToAccount`         | Derives Stacks account from private key |
| `decodePaymentResponse`       | Extracts tx hash from response headers  |
| `STXtoMicroSTX` / `BTCtoSats` | Amount conversion utilities             |
| `getDefaultSBTCContract`      | sBTC token contract resolution          |
| `getExplorerURL`              | Stacks Explorer transaction links       |
| `formatPaymentAmount`         | Human-readable amount formatting        |
| `resolveToken`                | STX/sBTC token type resolution          |

---

## Tech Stack

- **Runtime:** Node.js 18+ / TypeScript
- **Backend:** Express.js + x402-stacks middleware
- **Agent:** Axios + x402-stacks client wrapper
- **Blockchain:** Stacks testnet (Bitcoin L2)
- **Protocol:** x402 HTTP Payment Protocol v2
- **Facilitator:** Testnet facilitator for payment settlement

---

## Why This Matters

Traditional APIs use API keys and monthly subscriptions. x402 enables:

- **Pay-per-call pricing** — pay exactly for what you use
- **No API keys** — your wallet IS your identity
- **Machine-to-Machine (M2M) Economy** — This project demonstrates a true autonomous economy where AI agents negotiate, pay, and settle transactions with other agents and services without any human intervention. By removing manual payment friction, we unlock a scalable ecosystem of specialized micro-services.
- **Bitcoin-secured** — settled on Stacks, anchored to Bitcoin
- **Instant** — no invoices, no billing cycles, no disputes

This is the future of AI agent economics.

---

## License

MIT
