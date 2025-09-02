````markdown
Status: API stable • Cache + Safety + Safety + Metrics live • Web UI demo in progress • Grant in review

![API CI](https://github.com/deFiFello/cerberus-telegram-bot-tutorial/actions/workflows/api-ci.yml/badge.svg)

# 🐶 Cerberus: Solana Telegram Bot & Mini App

Cerberus is an **open-source, non-custodial Telegram bot and Mini App** for swaps on Solana, built with **Jupiter v6** and **Shield API**. Unlike custodial bots, Cerberus ensures users **always keep control of their funds**. The project serves both as a **public good tutorial** and a foundation for safe, production-ready Solana integrations.

---

## 📑 Table of contents
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
- [Appendix A — Whitepaper](#appendix-a--whitepaper)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Live demo](#live-demo)

---

## ✨ What you get
- ✅ Telegraf-based **Telegram bot**
- ✅ **Next.js Mini App** with wallet adapter for non-custodial signing
- ✅ **Node API proxy** with endpoints for Jupiter v6 (`/quote`, `/order`) and Shield API
- ✅ Clear **setup & deployment** steps (local + Render-ready)

---

## 📂 Repo layout
- `/api` # Node proxy (Express + TypeScript)
- `/bot` # Telegram bot commands (Telegraf)
- `/web` # Next.js Mini App (wallet connect + swap UI)
- `/docs` # Proof of Work (screenshots, PDF evidence, whitepaper)

---

## 🚀 Quick start with Docker
```bash
docker compose up --build -d

PORT=4000
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000
SLIP=50

# Test cache (MISS then HIT)
curl -i "http://localhost:$PORT/order?inputMint=$IN&outputMint=$OUT&amount=$AMT&slippageBps=$SLIP" | grep -i x-cache
curl -i "http://localhost:$PORT/order?inputMint=$IN&outputMint=$OUT&amount=$AMT&slippageBps=$SLIP" | grep -i x-cache

# Check metrics
curl -s "http://localhost:$PORT/metrics" | jq .

# Stop stack
docker compose down -v
````

-----

## 🛠 Local development

### Install dependencies for all workspaces:

```bash
cd api && npm install
cd ../bot && npm install
cd ../web && npm install
```

### Run API locally:

```bash
cd api
npm run dev
```

### Health check:

```bash
curl -s http://localhost:4000/health | jq .
```

-----

## ⚙️ Environment

### `api/.env`

```env
PORT=4000
QUOTE_BASE=[https://quote-api.jup.ag](https://quote-api.jup.ag)
LITE_BASE=[https://lite-api.jup.ag](https://lite-api.jup.ag)
ULTRA_BASE=[https://api.jup.ag/ultra](https://api.jup.ag/ultra)
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

-----

## 🔧 API endpoints

### `GET /`

Landing page with links.

### `GET /health`

API status + base URLs.

### `GET /order`

Quote (with optional swap build).
Required params: `inputMint`, `outputMint`, `amount`, `slippageBps`
Optional params: `buildTx=true&userPublicKey=<BASE58>`

#### Example:

```bash
# Quote only
curl -s "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | jq .

# Build transaction
PUBKEY=<your_base58_pubkey>
curl -s "http://localhost:4000/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" | jq .
```

Response header: `x-cache: MISS | HIT`

### `GET /tokens`

Passthrough to Jupiter Lite tokens.

### `GET /shield?mints=<mint1,mint2>`

Shield safety snapshot.

-----

## 🛡 Caching and safety

Redis caches quotes keyed by route inputs. The first call is a `MISS`, subsequent identical calls are a `HIT`.

Safety flags:

  - `ALLOWED_MINTS` → only allow these
  - `BLOCKED_MINTS` → reject with `SHIELD_FLAG`

-----

## 📊 Metrics

### `GET /metrics`

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
```

-----

## 🧪 Tests

Run with Vitest:

```bash
cd api
npm test
```

-----

## 📜 Scripts and examples

### Quote on hosted API

```bash
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000
SLIP=50

curl -s "[https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=$](https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=$){IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | jq .
```

### Build transaction on hosted API

```bash
PUBKEY=$(solana-keygen pubkey ~/.config/solana/id.json | tr -d '\n\r ')
curl -s "[https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=$](https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=$){IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" | jq .
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

-----

## ✅ Proof of work

  - ✅ API deployed to Render
  - ✅ `/health` and `/order` tested
  - ✅ Mainnet swap executed
  - ✅ Full repo structure: API, Bot, Web, Docs

### Evidence:

  - [Cerberus Proof of Work (PDF)](https://www.google.com/search?q=/docs/Cerberus_Proof_of_Work.pdf)
  - [Screenshots](https://www.google.com/search?q=/docs/screenshots.md)
  - [Whitepaper](https://www.google.com/search?q=/docs/whitepaper.md)

-----

## 📖 Appendix A — Whitepaper

1.  API Health — `/health` returns `ok: true`
2.  Successful Quote — `/order` returns route plan + `outAmount`
3.  Telegram Bot — `/start` works, swaps link to Mini App
4.  Non-Custodial TX — mainnet swap confirmed on Solana Explorer
5.  Open Source Repo — fully public
6.  Docs — PDF, screenshots, whitepaper included

-----

## 🗺 Roadmap

  - **Phase 1 — MVP** (✅ complete): API proxy, bot scaffold, mini app bootstrap, mainnet swap
  - **Phase 2 — Optimizations**: caching, parallel swaps, Shield prefetch, UX polish
  - **Phase 3 — Public good**: full tutorial + video walkthrough
  - **Phase 4 — Growth**: partnerships, institutional tier, referrals

-----

## 📜 License

Apache-2.0

-----

## 🤝 Acknowledgements

  - Jupiter Aggregator
  - Solana Foundation
  - Telegram Bot API

-----

## 🔗 Live demo

Base URL: `https://cerberus-telegram-bot-tutorial.onrender.com`

### Smoke test:

```bash
curl -s [https://cerberus-telegram-bot-tutorial.onrender.com/health](https://cerberus-telegram-bot-tutorial.onrender.com/health) | jq .
```

```
```