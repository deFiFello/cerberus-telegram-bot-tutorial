Status: API stable • Cache + Safety + Metrics live • Web UI demo in progress • In grant review  

![API CI](https://github.com/deFiFello/cerberus-telegram-bot-tutorial/actions/workflows/api-ci.yml/badge.svg)

# 🐶 Cerberus: Solana Telegram Bot & Mini App

Cerberus is an **open-source, non-custodial Telegram bot and Mini App** for swaps on Solana, built with **Jupiter v6** and **Shield API**.  
Unlike custodial bots, Cerberus ensures users **always keep control of their funds**.  
The project serves both as a **public good tutorial** and a foundation for safe, production-ready Solana integrations.

---

## Table of Contents
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
- [Proof of Work](#proof-of-work)
- [Appendix A — Whitepaper](#appendix-a--whitepaper)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Live demo](#live-demo)


## ✨ What You Get

- ✅ **Telegram Bot** — Telegraf-based, with modular commands
- ✅ **Next.js Mini App** — wallet adapter + swap UI for non-custodial signing
- ✅ **Node.js API Proxy** — Express + TypeScript endpoints for:
  - Jupiter v6 (`/quote`, `/order`)
  - Shield API (`/shield`)
- ✅ **Redis Cache** — MISS → HIT validation for faster order retrieval
- ✅ **Metrics Endpoint** — live service stats for monitoring and debugging
- ✅ **Full Setup Guide** — Docker quickstart + local dev instructions
- ✅ **Documentation & Proof** — whitepaper, screenshots, PDF, and tutorials

---
---

## 📂 Repo Layout

```plaintext
/api   # Node.js proxy (Express + TypeScript, Redis, metrics)
/bot   # Telegram bot commands (Telegraf)
/web   # Next.js Mini App (wallet connect + swap UI)
/docs  # Whitepaper, Proof of Work (PDF, screenshots)

---

## 🚀 Quick Start

### ⚡ Docker quickstart

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

---

## 💻 Local Development

### 1) Prerequisites
- Node.js 18+ (**20/22 recommended**)  
- Yarn or npm  
- A funded Solana wallet (`solana-keygen new -o ~/.config/solana/id.json`)

### 2) Clone & Install
```bash
git clone https://github.com/deFiFello/cerberus-telegram-bot-tutorial
cd cerberus-telegram-bot-tutorial

cd api && npm install
cd ../bot && npm install
cd ../web && npm install

---

### 3) Environment setup

### `api/.env`

```env
PORT=4000
QUOTE_BASE=https://quote-api.jup.ag
LITE_BASE=https://lite-api.jup.ag
ULTRA_BASE=https://api.jup.ag/ultra
JUP_ULTRA_KEY=

### `bot/.env`

```env
TELEGRAM_TOKEN=<your-telegram-bot-token>
PUBLIC_WEB_URL=https://<your-render-deployment>.onrender.com

### `web/.env`

```env
NEXT_PUBLIC_API_BASE=https://<your-render-deployment>.onrender.com

---

## 🖥️ Run Locally

### 1) Start API
```bash
cd api && npm run dev

### 2) Health Check

Visit in your browser or run:

```bash
curl -s http://localhost:4000/health | jq .

---

### ✅ Start Bot

```markdown
### 3) Start Bot

```bash
cd bot && npm run dev

---

### ✅ Start Web

```markdown
### 4) Start Web

```bash
cd web && npm run dev
## 🔌 API Endpoints

### `GET /`
Landing page with helpful links.

---

### `GET /health`
Returns base URLs and flags including Redis enablement.

---

### `GET /order`
Quote and optional swap builder.  

**Required query params**:
- `inputMint` (base58)  
- `outputMint` (base58)  
- `amount` (integer string in base units)  
- `slippageBps` (integer)  

**Optional**:
- `buildTx=true` → build a transaction  
- `userPublicKey` → required when `buildTx=true`  

**Examples**:

```bash
# quote only
curl -s "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | jq .
# build tx (replace with your pubkey)
PUBKEY=<your_base58_pubkey>
curl -s "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" | jq .

---

## ⚡ API Endpoints

### Response Headers
- `x-cache: MISS|HIT` → Redis cache status for the quote payload

---

### `GET /tokens`

Passthrough to **Jupiter Lite tokens**.

```http
GET /tokens

### GET `/shield?mints=<mint1,mint2>`

**Description:**  
Returns a **Shield safety snapshot** for the specified token mints.  

**Example Request:**
```http
GET /shield?mints=<mint1,mint2>

### Parameters

- **`mints`** → Comma-separated list of token mint addresses

### Response

Returns a JSON object with:
- **safety status** (e.g., safe, risky, unknown)  
- **risk categories** (rug risk, liquidity risk, etc.)  
- **metadata** (token info and context)
---

## 🔄 GET /swap

Executes a swap transaction via **Jupiter v6** aggregator.  
Takes input/output token mints, trade amount, and slippage settings.

### Parameters
- **inputMint** → Token mint of the asset you are selling  
- **outputMint** → Token mint of the asset you want to receive  
- **amount** → Trade amount in smallest unit (lamports for SOL)  
- **slippage** → Max allowed slippage % (e.g., `0.5` for 0.5%)  

### Example
```http
GET /swap?inputMint=So11111111111111111111111111111111111111112&outputMint=Es9vMFrzaCERZyXDJpWb1keg1V7Rk5QSR7rA5x4Z8F27&amount=1000000&slippage=0.5

### Response

Returns a **signed transaction object** that can be submitted to the Solana blockchain.

The response includes:
- **Routing details** → Information about how the swap is routed  
- **Estimated output** → Expected token amount after the swap  
- **Fee breakdown** → Detailed fee structure (liquidity, platform, network)

## 🛡️ Caching and Safety

### 1) Redis Caching  
To reduce load on Jupiter and improve performance, API responses are cached in **Redis**.  

- Quotes are cached by request payload (base/quote mints, amount, slippage).  
- Cache entries are short-lived (≈ 30s–60s TTL) to ensure prices remain fresh.  

**Example Response Header**:  
```http
x-cache: HIT   # Response served from Redis  
x-cache: MISS  # Response fetched from Jupiter and stored in Redis  

---

## 🛡️ Safety with Shield API

All swap routes are validated through **Shield API** before being returned.

- ✅ Detects malicious or high-risk tokens  
- ✅ Flags suspicious liquidity pools  
- ✅ Provides a safety score for each mint  

### Example Safety Snapshot

```json
{
  "mint": "So11111111111111111111111111111111111111112",
  "risk": "low",
  "category": "bluechip",
  "verified": true
}
