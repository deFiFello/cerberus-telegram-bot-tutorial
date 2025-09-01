Status: API stable • Cache + Safety + Metrics live • Web UI minimal demo in progress • In grant review

![API CI](https://github.com/deFiFello/cerberus-telegram-bot-tutorial/actions/workflows/api-ci.yml/badge.svg)


# 🐶 Cerberus: Solana Telegram Bot & Mini App

Cerberus is an **open-source, non-custodial Telegram bot and Mini App** for swaps on Solana, built with **Jupiter v6** and **Shield API**.  
Unlike custodial bots, Cerberus ensures users **always keep control of their funds**.  
The project serves both as a **public good tutorial** and a foundation for safe, production-ready Solana integrations.

---

## ✨ What You Get
- ✅ Telegraf-based **Telegram bot**
- ✅ **Next.js Mini App** with wallet adapter for non-custodial signing
- ✅ **Node API proxy** with endpoints for Jupiter v6 (`/quote`, `/order`) and Shield API
- ✅ Clear **setup & deployment** steps (local + Render-ready)

---

## 📂 Repo Layout
~~~
/api   # Node proxy (Express + TypeScript)
/bot   # Telegram bot commands (Telegraf)
/web   # Next.js Mini App (wallet connect + swap UI)
/docs  # Proof of Work (screenshots, PDF evidence, whitepaper)
~~~

---

## 🚀 Quick Start
### Docker quickstart

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

### 1) Prerequisites
- Node.js 18+ (20/22 recommended)  
- Yarn or npm  
- A funded Solana wallet (`solana-keygen new -o ~/.config/solana/id.json`)

### 2) Clone & Install
~~~bash
git clone https://github.com/deFiFello/cerberus-telegram-bot-tutorial
cd cerberus-telegram-bot-tutorial

cd api && npm install
cd ../bot && npm install
cd ../web && npm install
~~~

### 3) Environment Setup (examples below)
**api/.env**
~~~
PORT=4000
QUOTE_BASE=https://quote-api.jup.ag
LITE_BASE=https://lite-api.jup.ag
ULTRA_BASE=https://api.jup.ag/ultra
JUP_ULTRA_KEY=
~~~

**bot/.env**
~~~
TELEGRAM_TOKEN=<your-telegram-bot-token>
PUBLIC_WEB_URL=https://<your-render-deployment>.onrender.com
~~~

**web/.env**
~~~
NEXT_PUBLIC_API_BASE=https://<your-render-deployment>.onrender.com
~~~

### 4) Run Locally
~~~bash
cd api && npm run dev
~~~

Health check:
~~~bash
curl -s http://localhost:4000/health | jq .
~~~

---

## 🔧 API Endpoints
- **GET /** → landing page with links  
- **GET /health** → API status + base URLs  
- **GET /order** → quote  
  Example: `/order?inputMint=So111...&outputMint=EPjF...&amount=1000000&slippageBps=50`  
- **GET /order (buildTx)** → add `&buildTx=true&userPublicKey=<BASE58>`  
- **GET /tokens** → passthrough to Lite API  
- **GET /shield?mints=<mint1,mint2>** → Shield safety data

---

## 🧪 Test Scripts

### Quote (SOL → USDC)
~~~bash
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000   # 0.001 SOL (lamports)
SLIP=50       # 50 bps

curl -s "https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" | jq .
~~~

### Build Transaction
~~~bash
PUBKEY=$(solana-keygen pubkey ~/.config/solana/id.json | tr -d '\n\r ')
curl -s "https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" | jq .
~~~

### Send Swap (local script)
~~~bash
cd api
npx tsx src/swap-and-send.ts \
  --in So11111111111111111111111111111111111111112 \
  --out EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --amount 1000000 \
  --slip 50
~~~

---

## ✅ Proof of Work

- ✅ API deployed to [Render](https://cerberus-telegram-bot-tutorial.onrender.com)  
- ✅ `/health` and `/order` live-tested  
- ✅ Mainnet swap executed successfully  
- ✅ Full repo structure: API, Bot, Web  
- ✅ Tutorial included in this README

**Evidence**  
- 📄 PDF: [docs/proof/Cerberus-Proof-of-Work.pdf](docs/proof/Cerberus-Proof-of-Work.pdf)  
- 🖼️ Screens: [docs/proof/](docs/proof/)  
- 📑 Whitepaper: [docs/whitepaper.md](docs/whitepaper.md)

---

## Appendix A — Proof of Work (Whitepaper)
- **A1. API Health** — `/health` returns `ok: true` + base URLs  
- **A2. Successful Quote** — `/order` returns routed plan, outAmount, AMM  
- **A3. Telegram Bot** — `/start` works; swap commands generate Mini App links  
- **A4. Non-Custodial Transaction** — mainnet swap confirmed on Solana Explorer  
- **A5. Open-Source Repo** — https://github.com/deFiFello/cerberus-telegram-bot-tutorial  
- **A6. Screenshots & PDF** — see [docs/proof/](docs/proof/) and the PDF

---

## 🗺 Roadmap (phased)
- **Phase 1 — MVP (✅ complete):** API proxy, bot skeleton, mini app bootstrap, mainnet swap.  
- **Phase 2 — Optimizations:** caching, parallel swaps, Shield prefetch, fee tiers, priority exec, UX.  
- **Phase 3 — Public Good:** full tutorial (+ video), example integrations.  
- **Phase 4 — Growth:** partnerships, institutional tier, referrals, multi-region deploys.

---

## 📜 License
Apache-2.0

---

## 🤝 Acknowledgements
- [Jupiter Aggregator](https://jup.ag)  
- [Solana Foundation](https://solana.org)  
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

## 🔗 Live Demo
Base URL: https://cerberus-telegram-bot-tutorial.onrender.com

Quick smoke test:
~~~bash
curl -s https://cerberus-telegram-bot-tutorial.onrender.com/health | jq .
~~~
