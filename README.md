Status: API stable • Cache + Safety + Metrics live • Web UI demo in progress • In grant review

![API CI](https://github.com/deFiFello/cerberus-telegram-bot-tutorial/actions/workflows/api-ci.yml/badge.svg)

# Cerberus: Solana Telegram Bot and Mini App

Cerberus is a non-custodial Telegram bot and Mini App for swaps on Solana using Jupiter v6 and Shield. Users sign with their own wallet. This repo is both a tutorial and a production baseline.

---

## Table of contents
- [What you get](#what-you-get)
- [Repo layout](#repo-layout)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development](#local-development)
- [Environment](#environment)
- [API endpoints](#api-endpoints)
- [Caching and safety](#caching-and-safety)
- [Metrics](#metrics)
- [Tests](#tests)
- [Scripts and examples](#scripts-and-examples)
- [Proof of work](#proof-of-work)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Live demo](#live-demo)

---

## What you get
- Telegraf Telegram bot scaffold
- Next.js Mini App starter with wallet adapter
- TypeScript Express API proxy for Jupiter v6 and Shield
- Redis quote caching (MISS → HIT)
- Safety filters (allow list and block list)
- Minimal metrics endpoint
- Dockerized local stack

---

## Repo layout
```text
/api   # Node proxy (Express + TypeScript)
/bot   # Telegram bot commands (Telegraf)
/web   # Next.js Mini App (wallet connect + swap UI)
/docs  # Proof (screenshots, PDF, whitepaper)

Quick start with Docker

-----------------------

Bring up API and Redis locally.

```bash
docker compose up --build -d

PORT=4000  # set 4001 if you remapped in compose
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000
SLIP=50

# expect MISS then HIT via x-cache header
curl -i "http://localhost:${PORT}/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | grep -i x-cache
curl -i "http://localhost:${PORT}/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | grep -i x-cache

# metrics
curl -s "http://localhost:${PORT}/metrics" | jq .

# stop stack
docker compose down -v

Port 4000 busy
--------------

Edit `docker-compose.yml`:

```diff
-    ports:
-      - "4000:4000"
+    ports:
+      - "4001:4000"

Local development
-----------------

Run the API locally.

```bash
git clone https://github.com/deFiFello/cerberus-telegram-bot-tutorial
cd cerberus-telegram-bot-tutorial

cd api
cp .env.example .env
npm ci
npm run dev

Health check
------------

```bash
curl -s http://localhost:4000/health | jq .

Environment
-----------

### api/.env

```ini
# server
PORT=4000

# upstreams
QUOTE_BASE=https://quote-api.jup.ag
LITE_BASE=https://lite-api.jup.ag
ULTRA_BASE=https://api.jup.ag/ultra
JUP_ULTRA_KEY=

# caching
REDIS_URL=redis://127.0.0.1:6379

# safety
ALLOWED_MINTS=
BLOCKED_MINTS=

bot/.env
--------

```ini
TELEGRAM_TOKEN=<your-telegram-bot-token>
PUBLIC_WEB_URL=https://<your-render-deployment>.onrender.com

web/.env
--------

```ini
NEXT_PUBLIC_API_BASE=https://<your-render-deployment>.onrender.com

API endpoints
-------------

GET `/`
-------

Landing page with helpful links.

GET `/health`
-------------

Returns base URLs and flags including Redis enablement.

GET `/order`
------------

Quote and optional swap builder.

**Required query:**
- `inputMint` (base58)
- `outputMint` (base58)
- `amount` (integer string in base units)
- `slippageBps` (integer)

**Optional:**
- `buildTx=true` to build a transaction
- `userPublicKey` required when `buildTx=true`

**Examples:**

```bash
# quote only
curl -s "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | jq .

# build tx (replace with your pubkey)
PUBKEY=<your_base58_pubkey>
curl -s "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" | jq .

Response headers
----------------

- `x-cache: MISS|HIT` — Redis cache status for the quote payload

GET `/tokens`
-------------

Passthrough to Jupiter Lite tokens.

GET `/shield?mints=<mint1,mint2>`
--------------------------------

Shield safety snapshot.

Caching and safety
------------------

- Redis caches quotes keyed by route inputs. First call is MISS, repeat with same params is HIT.  

- Safety controls:  
  - `ALLOWED_MINTS` — comma list. If set, only these mints are allowed.  
  - `BLOCKED_MINTS` — comma list. If set, these mints are rejected with `code: "SHIELD_FLAG"`.  

Metrics
-------

`GET /metrics` returns service stats.

```json
{
  "uptimeSec": 968,
  "order": {
    "requests": 4,
    "cache": { "hit": 2, "miss": 2 },
    "safetyBlocks": 0,
    "upstreamFail": 0,
    "latencyMs": { "avg": 261, "p50": 39, "p95": 151 }
  }
}
Tests
-----

Vitest validates `/order` and `/metrics`, including MISS then HIT.

```bash
cd api
npm test

Scripts and examples
--------------------

### Quote on hosted API

```bash
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000
SLIP=50

curl -s "https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | jq .

### Build transaction on hosted API

```bash
PUBKEY=$(solana-keygen pubkey ~/.config/solana/id.json | tr -d '\n\r ')
curl -s "https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" | jq .

### Local swap sender

```bash
cd api
npx tsx src/swap-and-send.ts \
  --in So11111111111111111111111111111111111111112 \
  --out EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --amount 1000000 \
  --slip 50

Proof of work
-------------

- API deployed to Render when link is online  
- `/health` and `/order` live tested  
- Mainnet swap executed  
- Repo includes API, Bot, Web, and tutorial content  

**Evidence:**
- `docs/proof/Cerberus-Proof-of-Work.pdf`  
- `docs/proof/`  
- `docs/whitepaper.md`  

Roadmap
-------

- **Phase 1 — MVP:** API proxy, bot scaffold, mini app starter, mainnet swap  
- **Phase 2 — Optimizations:** cache polish, parallel swaps, Shield prefetch, fee tiers, priority fee, UX  
- **Phase 3 — Public good:** full tutorial and video walkthroughs, sample integrations  
- **Phase 4 — Growth:** partnerships, institutional tier, referrals, multi-region deploys  

**Progress:**
- [x] API stable  
- [x] Redis MISS→HIT  
- [x] Metrics and safety flags  
- [x] Dockerized local stack  
- [ ] Web UI demo merge  
- [ ] Full tutorial (screens and video)  

License
-------

Apache-2.0

Acknowledgements
----------------

- Jupiter Aggregator  
- Solana Foundation  
- Telegram Bot API  

Live demo
---------

**Base URL:**

```text
https://cerberus-telegram-bot-tutorial.onrender.com

Smoke test
----------

Run against local API (expect MISS then HIT).

```bash
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000
SLIP=50

# first call (MISS)
curl -i "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | grep -i x-cache

# second call (HIT)
curl -i "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | grep -i x-cache

# metrics
curl -s "http://localhost:4000/metrics" | jq .
