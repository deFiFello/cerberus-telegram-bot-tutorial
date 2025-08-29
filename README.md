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
/api # Node proxy (Express + TypeScript)
/bot # Telegram bot commands (Telegraf)
/web # Next.js Mini App (wallet connect + swap UI)
/docs # Proof of Work (screenshots, PDF evidence, whitepaper)

bash
Copy code

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ (20/22 recommended)  
- Yarn or npm  
- A funded Solana wallet (`solana-keygen new -o ~/.config/solana/id.json`)  

### 2. Clone & Install
```bash
git clone https://github.com/deFiFello/cerberus-telegram-bot-tutorial
cd cerberus-telegram-bot-tutorial

cd api && npm install
cd ../bot && npm install
cd ../web && npm install
3. Environment Setup
Create .env files (examples provided in each package):

api/.env

env
Copy code
PORT=4000
QUOTE_BASE=https://quote-api.jup.ag
LITE_BASE=https://lite-api.jup.ag
ULTRA_BASE=https://api.jup.ag/ultra
JUP_ULTRA_KEY=   # optional, needed only for Ultra features
bot/.env

env
Copy code
TELEGRAM_TOKEN=<your-telegram-bot-token>
PUBLIC_WEB_URL=https://<your-render-deployment>.onrender.com
web/.env

env
Copy code
NEXT_PUBLIC_API_BASE=https://<your-render-deployment>.onrender.com
4. Run Locally
bash
Copy code
cd api && npm run dev
Test health:

bash
Copy code
curl -s http://localhost:4000/health | jq .
🔧 API Endpoints
GET / → landing page with links

GET /health → API status + base URLs

GET /order → quote

bash
Copy code
/order?inputMint=So111...&outputMint=EPjF...&amount=1000000&slippageBps=50
GET /order (buildTx) → add &buildTx=true&userPublicKey=<BASE58>

GET /tokens → passthrough to Lite API

**GET /shield?mints=<mint1,mint2>` → Shield safety data

🧪 Test Scripts
Quote Test

bash
Copy code
IN=So11111111111111111111111111111111111111112
OUT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
AMT=1000000
SLIP=50

curl -s \
 "https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}" \
| jq .
Build Transaction

bash
Copy code
PUBKEY=$(solana-keygen pubkey ~/.config/solana/id.json | tr -d '\n\r ')
curl -s \
 "https://cerberus-telegram-bot-tutorial.onrender.com/order?inputMint=${IN}&outputMint=${OUT}&amount=${AMT}&slippageBps=${SLIP}&buildTx=true&userPublicKey=${PUBKEY}" \
| jq .
Send Swap

bash
Copy code
cd api
npx tsx src/swap-and-send.ts \
  --in So11111111111111111111111111111111111111112 \
  --out EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --amount 1000000 \
  --slip 50
✅ Proof of Work
✅ API deployed to Render

✅ /health and /order live-tested

✅ Mainnet swap executed successfully (Explorer proof)

✅ Full repo structure: API, Bot, Web

✅ Tutorial included in this README

📄 Full Proof of Work PDF
🖼️ Supporting Screenshots
📑 Whitepaper

🗺 Roadmap
Phase 1 – MVP (✅ complete)

API proxy live

Telegram bot skeleton

Mini App bootstrap

Mainnet swap confirmed

Phase 2 – Optimizations

Caching, parallel swaps, Shield prefetch

Fee tiers + priority execution

UX shortcuts & templates

Phase 3 – Public Good Deliverable

Open-source tutorial + video walkthroughs

Example integrations for Solana devs

Phase 4 – Growth

Partnerships with Jupiter / Solana ecosystem

Institutional tier, referral rewards

Multi-region deployments

📜 License
Apache-2.0

🤝 Acknowledgements
Jupiter Aggregator

Solana Foundation

Telegram Bot API

🔗 Live Demo
Cerberus API is live and fully integrated with Jupiter v6.

Base URL: https://cerberus-telegram-bot-tutorial.onrender.com

Quick smoke test:

bash
Copy code
curl -s https://cerberus-telegram-bot-tutorial.onrender.com/health | jq .