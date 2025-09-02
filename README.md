Status: API stable • Cache + Safety + Metrics live • Web UI demo in progress • In grant review

![API CI](https://github.com/deFiFello/cerberus-telegram-bot-tutorial/actions/workflows/api-ci.yml/badge.svg)

# Cerberus: Solana Telegram Bot & Mini App

Cerberus is an open-source, non-custodial Telegram bot and Mini App for swaps on Solana, built with **Jupiter v6** and **Shield API**.  
Unlike custodial bots, Cerberus ensures users **always keep control of their funds**.  
The project serves both as a **public good tutorial** and a foundation for safe, production-ready Solana integrations.

---

## Table of Contents
- [What you get](#what-you-get)
- [Repo layout](#repo-layout)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development](#local-development)
- [Environment](#environment)
- [Run locally](#run-locally)
- [API endpoints](#api-endpoints)
- [Caching and safety](#caching-and-safety)
- [Metrics](#metrics)
- [Tests](#tests)
- [Scripts and examples](#scripts-and-examples)
- [Proof of work](#proof-of-work)
- [Appendix A: Whitepaper](#appendix-a-whitepaper)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Live demo](#live-demo)

---

## What you get
- ✅ **Telegram Bot** — Telegraf-based, modular commands  
- ✅ **Next.js Mini App** — wallet adapter + swap UI for non-custodial signing  
- ✅ **Node API Proxy** — Express + TypeScript endpoints for:
  - Jupiter v6 (`/order` with `buildTx=true`)
  - Shield API (`/shield`)
- ✅ **Redis Cache** — MISS → HIT validation for faster quotes  
- ✅ **Metrics Endpoint** — live stats for monitoring and debugging  
- ✅ **Full Setup Guide** — Docker quickstart + local dev  
- ✅ **Documentation & Proof** — whitepaper, screenshots, PDF, tutorials

---

## Repo layout

```text
/api   # Node.js proxy (Express + TypeScript, Redis, metrics)
/bot   # Telegram bot (Telegraf)
/web   # Next.js Mini App (wallet connect + swap UI)
/docs  # Whitepaper, Proof of Work (PDF, screenshots)
```

---

## Quick start with Docker

```bash
docker compose up --build -d

PORT=4000   # or 4001 if you remapped
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000
SLIP=50

# MISS then HIT
curl -i "http://localhost:$PORT/order?inputMint=$IN&outputMint=$OUT&amount=$AMT&slippageBps=$SLIP" | grep -i x-cache
curl -i "http://localhost:$PORT/order?inputMint=$IN&outputMint=$OUT&amount=$AMT&slippageBps=$SLIP" | grep -i x-cache

# metrics
curl -s "http://localhost:$PORT/metrics" | jq .

# stop stack
docker compose down -v
```

---

## Local development

### 1) Prerequisites
- Node.js 18+ (20 or 22 recommended)  
- Yarn or npm  
- A funded Solana wallet (`solana-keygen new -o ~/.config/solana/id.json`)

### 2) Clone & install
```bash
git clone https://github.com/deFiFello/cerberus-telegram-bot-tutorial
cd cerberus-telegram-bot-tutorial

cd api && npm install
cd ../bot && npm install
cd ../web && npm install
```

---

## Environment

### `api/.env`
```env
PORT=4000
QUOTE_BASE=https://quote-api.jup.ag
LITE_BASE=https://lite-api.jup.ag
ULTRA_BASE=https://api.jup.ag/ultra
JUP_ULTRA_KEY=
```

### `bot/.env`
```env
TELEGRAM_TOKEN=<your-telegram-bot-token>
PUBLIC_WEB_URL=https://<your-render-deployment>.onrender.com
```

### `web/.env`
```env
NEXT_PUBLIC_API_BASE=https://<your-render-deployment>.onrender.com
```

---

## Run locally

### 1) Start API
```bash
cd api && npm run dev
```

### 2) Health check
```bash
curl -s http://localhost:4000/health | jq .
```

### 3) Start Bot
```bash
cd bot && npm run dev
```

### 4) Start Web
```bash
cd web && npm run dev
```

---

## API endpoints

### `GET /`
Landing page with helpful links.

---

### `GET /health`
Returns base URLs and flags including Redis enablement.

---

### `GET /order`
Quote and optional swap builder.

**Required query params**
- `inputMint` (base58)
- `outputMint` (base58)
- `amount` (integer string in base units)
- `slippageBps` (integer)

**Optional**
- `buildTx=true` → build a transaction
- `userPublicKey` → required when `buildTx=true`

**Examples**
```bash
# quote only
curl -s "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | jq .

# build tx (replace with your pubkey)
PUBKEY=<your_base58_pubkey>
curl -s "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" | jq .
```

**Response headers**
- `x-cache: MISS|HIT` → Redis cache status for the quote payload

---

### `GET /tokens`
Passthrough to Jupiter Lite tokens.
```http
GET /tokens
```

---

### `GET /shield?mints=<mint1,mint2>`
Shield safety snapshot for specified token mints.

**Parameters**
- `mints` → comma separated mint list

**Example**
```http
GET /shield?mints=<mint1,mint2>
```

**Response**
JSON object with safety status, risk categories, and metadata.

---

## Caching and safety

### 1) Redis caching
Quotes are cached by request payload (base and quote mints, amount, slippage).  
Entries are short lived to keep prices fresh.

**Example response headers**
```http
x-cache: HIT   # served from Redis
x-cache: MISS  # fetched and stored
```

### 2) Safety with Shield API
All routes are validated through **Shield API** before being returned.
- Detects malicious or high-risk tokens
- Flags suspicious liquidity pools
- Provides a safety score for each mint

**Example safety snapshot**
```json
{
  "mint": "So11111111111111111111111111111111111111112",
  "risk": "low",
  "category": "bluechip",
  "verified": true
}
```

---

## Metrics
```bash
curl -s "http://localhost:4000/metrics" | jq .
```
Typical fields include uptime, order counts, cache hit/miss, safety blocks, and latency.

---

## Tests
Vitest validates `/order` and `/metrics` including MISS then HIT.
```bash
cd api
npm test
```

---

## Scripts and examples

### Quote on hosted API
```bash
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000
SLIP=50

curl -s "https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | jq .
```

### Build transaction on hosted API
```bash
PUBKEY=$(solana-keygen pubkey ~/.config/solana/id.json | tr -d '\n\r ')
curl -s "https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" | jq .
```

### Local swap sender
```bash
cd api
npx tsx src/swap-and-send.ts \
  --in So11111111111111111111111111111111111111112 \
  --out EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --amount 1000000 \
  --slip 50
```

---

## ✅ Proof of Work

- [Cerberus Proof of Work (PDF)](docs/proof/Cerberus-Proof-of-Work.pdf)
- [Screenshots](docs/proof/)
- [Whitepaper](docs/whitepaper.md)

---

## — Whitepaper

See the **[whitepaper](docs/whitepaper.md)**.

---

## 🔗 Live demo

Base URL: <https://cerberus-telegram-bot-tutorial.onrender.com>

**Smoke test**
```bash
curl -s https://cerberus-telegram-bot-tutorial.onrender.com/health | jq .

---

## Roadmap
**Phase 1 - MVP**: API proxy, bot scaffold, mini app starter, mainnet swap  
**Phase 2 - Optimizations**: cache polish, parallel swaps, Shield prefetch, fee tiers, priority fee, UX  
**Phase 3 - Public good**: tutorial and video walkthroughs, sample integrations  
**Phase 4 - Growth**: partnerships, institutional tier, referrals, multi-region deploys

**Progress**
- API stable
- Redis MISS to HIT
- Metrics and safety flags
- Dockerized local stack
- Web UI demo merge
- Full tutorial (screens and video)

---

## License
Apache-2.0

---

## Acknowledgements
Jupiter Aggregator • Solana Foundation • Telegram Bot API

---

## Live demo
Base URL: *(fill in your Render URL when live)*
