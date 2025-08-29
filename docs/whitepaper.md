# Cerberus — Non-Custodial Telegram Bot & Mini App for Solana

**Project type:** Open-source public good + developer tutorial  
**Stack:** Solana, Jupiter v6, Shield API, Telegraf, Next.js, TypeScript  
**Repo:** https://github.com/deFiFello/cerberus-telegram-bot-tutorial

---

## 1) Executive Summary

Cerberus is a **non-custodial, open-source** Telegram bot and Mini App that enables safe token swaps on Solana via **Jupiter v6**, with optional **Shield API** safety checks.  
Unlike custodial bots, users always sign with their own wallet. The codebase is designed as a **teaching resource** and a production-ready starter for builders.

The project already has a **live API**, successful **mainnet swap**, and a public repo. Grant funds accelerate optimization, docs/video tutorial, and developer adoption.

---

## 2) Problem

Most popular Telegram bots on Solana are **custodial**: users deposit funds to third-party wallets, creating theft/exploit risk and eroding trust.  
At the same time, new builders lack a clear, modern reference for **non-custodial** Telegram/Mini-App patterns on Solana.

---

## 3) Solution

Cerberus provides:
- A **Node proxy** that calls Jupiter v6 for quotes/swaps and checks tokens via Shield.
- A **Telegram bot (Telegraf)** that issues commands and deep-links to the Mini App.
- A **Next.js Mini App** that connects a wallet (Wallet Adapter) for **client-side signing**.
- A complete, open-source **tutorial** so others can replicate and extend.

**Key principles**
- Non-custodial by default: server builds but **never signs** user transactions.
- Safety-first: token checks (Shield), progressive validation, and whitelisting options.
- Minimal friction UX with Mini App + wallet adapter.

---

## 4) Architecture

**API (Express + TypeScript)**
- Endpoints: `/health`, `/order` (quote), `/order?…&buildTx=true` (serialized swap), `/tokens`, `/shield`.
- Proxies Jupiter v6; can add platform fees later.
- Optional Shield checks before swap build.

**Telegram Bot (Telegraf)**
- Commands like `/start`, `/swap SOL USDC 0.1`.
- Generates Mini App deep links to complete signing securely.

**Mini App (Next.js)**
- Wallet Adapter for Phantom/etc.
- Presents quote, confirms, and requests signature from user wallet.

---

## 5) Proof of Work

- Live API: https://cerberus-telegram-bot-tutorial.onrender.com  
- `/health` OK; `/order` returns routed plans from Jupiter.  
- Mainnet swap executed and confirmed.  
- Public repo: https://github.com/deFiFello/cerberus-telegram-bot-tutorial  
- Evidence:  
  - PDF: [docs/proof/Cerberus-Proof-of-Work.pdf](docs/proof/Cerberus-Proof-of-Work.pdf)  
  - Screenshots: [docs/proof/](docs/proof/)

---

## 6) Competitive Landscape

| Bot        | Custodial | Open Source | Safety Layer | Public Good |
|------------|-----------|-------------|--------------|-------------|
| **Cerberus** | ❌ No     | ✅ Yes      | ✅ Shield API | ✅ Yes       |
| Trojan     | ✅ Yes     | ❌ No       | ❌           | ❌          |
| BONKbot    | ✅ Yes     | ❌ No       | ❌           | ❌          |
| Photon     | Mixed     | ❌ No       | ❌           | ❌          |

Cerberus is the only **open-source, non-custodial, safety-first** template aimed at developers.

---

## 7) Why Solana

- **Sub-second finality** for responsive UX.  
- **Sealevel** parallel execution for throughput and low latency.  
- **Low fees** enable micro-swaps and frequent transactions.  
These properties make non-custodial Telegram flows practical for everyday users.

---

## 8) Roadmap & Milestones

**Phase 1 — MVP (✅ complete)**
- API proxy, bot skeleton, Mini App bootstrap, mainnet swap.

**Phase 2 — Optimizations**
- Local cache for hot pairs, parallel swaps, Shield prefetch.  
- Fee tiers & optional priority execution.  
- UX polish (favorites, templates, large-trade confirm).

**Phase 3 — Public Good Deliverable**
- Full tutorial site + video walkthroughs.  
- Example integrations for Mini Apps.  
- Publish an **analytics starter kit** (basic on-chain trade history tools).

**Phase 4 — Growth**
- AI-assisted wallet insights & predictive risk scoring.  
- Partnerships with Jupiter/ecosystem projects.  
- Multi-region deployments.

---

## 9) Budget & Use of Funds (Request: **$10k–$25k**)

- Hosting/RPC & monitoring  
- Documentation + tutorial production (written & video)  
- UX improvements for Mini App  
- Developer support & examples  
- Seed work on analytics/AI modules

Solo build initially; expandable if traction warrants.

---

## 10) Risks & Mitigations

- **API changes / upstream downtime** → fallback endpoints, retries, health checks.  
- **User error** → confirmations for large trades, whitelist mode, clearer warnings.  
- **Security** → non-custodial by design; no private keys on server; minimal state.

---

## 11) License

**Apache-2.0** — free to use, fork, and extend.

---

## 12) Contact & Links

- Repo: https://github.com/deFiFello/cerberus-telegram-bot-tutorial  
- Live API: https://cerberus-telegram-bot-tutorial.onrender.com  
- Evidence: [docs/proof/](docs/proof/) & [docs/proof/Cerberus-Proof-of-Work.pdf](docs/proof/Cerberus-Proof-of-Work.pdf)
