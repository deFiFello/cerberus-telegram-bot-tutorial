# Cerberus — Non-Custodial Swap & Portfolio Analytics Platform for Solana

**Project type:** Business-first product (Telegram Bot + Mini App + DApp)  
**Stack:** Solana, Jupiter v6, Shield API, RugCheck heuristics, Telegraf, Next.js, Express + TypeScript, Postgres, Redis  
**Repo:** https://github.com/deFiFello/cerberus-telegram-bot-tutorial  

---

## 1) Executive Summary

Cerberus is a **non-custodial, multi-channel trading and portfolio analytics platform** for Solana.  
It unifies **fast, safe swaps** with **deep portfolio intelligence** across three surfaces:

- Telegram Bot (commands and alerts)  
- Telegram Mini App (mobile signing + overview)  
- Full DApp (advanced dashboards, institutional features)  

Unlike custodial bots, Cerberus never holds user funds—every swap is signed by the user’s wallet.  
Unlike wallets like Phantom, Cerberus adds **true PnL, risk scoring, alerts, and hygiene tools**.  
The mission: become the **default Solana trading copilot** for retail, casual investors, and institutions.  

---

## 2) Problem

- Custodial Telegram bots (Trojan, BONKbot) require deposits → theft/exploit risk.  
- Wallets (Phantom, Solflare) focus on UX but lack **true PnL, alerts, and risk intelligence**.  
- Traders juggle fragmented tools:  
  - **Birdeye** for token liquidity and whale moves  
  - **Step** for PnL/net worth  
  - **RugCheck** for safety  
  None of these unify execution + analytics.  

Result: users either risk funds with custodial bots, or miss actionable insights while swapping.

---

## 3) Solution

Cerberus integrates **execution, analytics, and safety** in one product:  

- **Execution**  
  - Jupiter v6 routing (best price, multi-hop swaps)  
  - Pre-trade gating via Shield API and Cerberus Score  
  - Route transparency: price impact, fees, pool mix, fill vs. quote  

- **Portfolio Analytics**  
  - Balances, allocations, multi-wallet grouping  
  - True PnL with FIFO cost basis, realized/unrealized  
  - Trade history with attribution  
  - CSV export for bookkeeping  

- **Risk & Hygiene**  
  - Token safety scoring (Shield + RugCheck heuristics)  
  - Spam/airdrop filters, dust cleanup suggestions  
  - Approval reviews, wallet health checks  

- **Alerts**  
  - Price thresholds, volatility spikes  
  - Risk flags, suspicious inflows/outflows  
  - PnL milestones, route quality changes  

- **Multi-channel UX**  
  - Telegram Bot for instant commands (`/quote`, `/swap`, `/pnl`, `/risk`)  
  - Mini App for fast swaps, portfolio tabs, alerts  
  - DApp for advanced dashboards, institutional features, exports  

---

## 4) Architecture

**API (Express + TypeScript + Redis)**  
- Endpoints: `/order`, `/portfolio/overview`, `/portfolio/pnl`, `/risk/holdings`, `/alerts/*`.  
- Proxies Jupiter v6 and Shield API; stores enriched analytics.  

**Database (Postgres)**  
- Tables: swaps, transfers, holdings, price history, alerts, token safety.  
- Materialized snapshots for fast UI load.  

**Bot (Telegraf)**  
- Modular commands; deep-links into Mini App.  

**Mini App (Next.js)**  
- Wallet Adapter; tabs for Overview, PnL, Risk, Alerts.  

**DApp**  
- Extended dashboards, multi-wallet roll-ups, CSV/API, institutional tier.  

---

## 5) Use Cases

**Retail Trader**  
- Swap fast in Telegram with pre-trade safety.  
- Track PnL and execution quality (fees, slippage).  

**Casual Investor**  
- One-tap overview of holdings, alerts for big moves.  
- Portfolio hygiene: dust cleanup, scam filters.  

**Institutions & DAOs**  
- Consolidate many wallets into portfolios.  
- Team dashboards with role-based access.  
- Exports for compliance and accounting.  

**Partnerships**  
- Referral-based routing with Jupiter.  
- Wallet deep-links + co-marketing (Phantom, Solflare).  
- Research + trust layers with Shield/RugCheck.  

---

## 6) Competitive Landscape

| Tool      | Custodial | Non-Custodial | Analytics | Risk Layer | Multi-Channel |
|-----------|-----------|---------------|-----------|------------|---------------|
| Trojan    | ✅ Yes    | ❌ No         | ❌ No     | ❌ No      | Telegram only |
| BONKbot   | ✅ Yes    | ❌ No         | ❌ No     | ❌ No      | Telegram only |
| Phantom   | ❌ No     | ✅ Yes        | Limited   | Spam only  | Wallet app    |
| Step      | ❌ No     | ✅ Yes        | PnL/NFTs  | ❌ No      | Web app       |
| **Cerberus** | ❌ No | ✅ Yes        | ✅ Full   | ✅ Yes      | ✅ Bot + Mini + DApp |

Cerberus is the only **non-custodial, analytics-first, safety-first platform** with **multi-channel reach**.

---

## 7) Roadmap & Milestones

**Phase 1 — MVP (✅ complete)**  
- API proxy, Telegram bot, Mini App starter, mainnet swap.  

**Phase 2 — Optimizations (current)**  
- Cache polish, parallel swaps, Shield prefetch, UX refinements.  

**Phase 2.5 — Portfolio Analytics MVP (new)**  
- Multi-wallet overview  
- PnL v1 (realized/unrealized)  
- Cerberus Score (risk + heuristics)  
- Alerts (price, risk, wallet inflow/outflow)  
- Route transparency cards  
- Wallet hygiene tools  

**Phase 3 — DApp & Platform Growth**  
- Full DApp rollout with extended dashboards  
- Positions coverage (staked SOL, major protocols)  
- CSV export, watchlists, more alert types  

**Phase 4 — Business Scale**  
- Pro/Institutional tiers with RBAC, API/webhooks, SLA  
- Multi-region deployments  
- AI-driven wallet insights & predictive risk  
- Ecosystem partnerships  

---

## 8) Business Model

- **Free**:  
  Swaps, basic overview, basic risk flags, 1 wallet, essential alerts.  

- **Pro ($9–19/mo)**:  
  Multi-wallet PnL, advanced alerts, detailed Cerberus Score, CSV export.  

- **Institutional ($299–999+/mo)**:  
  Shared/team portfolios, role-based access, webhooks/API, SLA-backed uptime.  

- **Revenue Streams**:  
  - Subscription tiers  
  - Referral rewards on routed volume  
  - Protocol partnerships & integrations  

---

## 9) Risks & Mitigations

- **Data correctness (PnL, prices)** → store minute price snapshots; auditable history.  
- **Vendor dependence** → redundant indexers, multiple safety providers.  
- **Scope creep** → strict phase gating (execution + analytics core first).  
- **Competition** → wedge on **Telegram + analytics + risk combo**, not just swaps.  

---

## 10) License

**Apache-2.0** — core remains open-source for trust; monetization via Pro/Institutional services.

---

## 11) Contact & Links

- Repo: https://github.com/deFiFello/cerberus-telegram-bot-tutorial  
- Live API: https://cerberus-telegram-bot-tutorial.onrender.com  
- Screenshots & Proof: [docs/proof/](docs/proof/)  
