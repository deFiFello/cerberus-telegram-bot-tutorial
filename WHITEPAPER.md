Appendix A — Proof of Work (Whitepaper)

A1. API Health — /health returns ok: true + base URLs.

A2. Successful Quote — /order returns routed plan, outAmount, AMM.

A3. Telegram Bot — /start works, swap commands generate mini-app links.

A4. Non-Custodial Transaction — mainnet swap confirmed on Solana Explorer.

A5. Open-Source Repo — Cerberus GitHub Repo
.

A6. Screenshots/PDF — see docs/proof
.
---

# ✅ Final `whitepaper.md`

```md
# 🐶 Cerberus: Non-Custodial Telegram Bot & Mini App for Solana

Cerberus is an **open-source, non-custodial Telegram bot and Mini App** built on Solana using **Jupiter v6** and **Shield API**.  
It provides a safer alternative to custodial bots by ensuring users **always retain control of their funds**.  
The project serves as both a **public good tutorial for Solana developers** and a production-ready framework for non-custodial swaps.

---

## 🚨 Why Cerberus Matters (Public Good)

Existing Telegram trading bots on Solana (e.g. Trojan, BONKbot) have grown quickly, but most use **custodial architectures** where users must deposit funds into third-party wallets.  
This model introduces major risks, highlighted by the **BONKbot exploit** where attackers stole more than $553,000 in SOL.  

Cerberus is different:
- **Non-Custodial**: users sign all transactions with their own wallet (e.g. Phantom).  
- **Open Source**: code is available for other developers to learn from, fork, and extend.  
- **Educational**: built as a full tutorial, showing how to integrate Solana dApps safely in Telegram and Mini Apps.  

By lowering barriers for developers and reducing risks for retail users, Cerberus directly contributes to Solana’s public good mission.

---

## 🛠 What Cerberus Is (Scope)

Cerberus consists of three core components:

1. **API Proxy**  
   - Express + TypeScript backend.  
   - Secure proxy to Jupiter v6 Quote & Swap APIs and Shield API.  

2. **Telegram Bot**  
   - Built with Telegraf.  
   - Provides `/swap` commands and connects to the Mini App for wallet signing.  

3. **Next.js Mini App**  
   - Frontend with wallet adapter.  
   - Enables a seamless non-custodial flow: user requests swap → wallet opens → sign & confirm.  

---

## ✅ Proof of Work

- **API deployed on Render**: [Live API](https://cerberus-telegram-bot-tutorial.onrender.com)  
- `/health` and `/order` endpoints tested successfully  
- Mainnet swap executed and confirmed (Explorer screenshot in repo)  
- Public repository: [Cerberus GitHub Repo](https://github.com/deFiFello/cerberus-telegram-bot-tutorial)  
- Full evidence: [Proof of Work PDF](proof/Cerberus-Proof-of-Work.pdf)  

---

## 📐 Technical Architecture

- **Node Proxy (API)** — wraps Jupiter v6 Quote/Swap + Shield API.  
- **Telegram Bot** — Telegraf commands, integrates Mini App deep links.  
- **Mini App (Web)** — Next.js app with Solana wallet adapter for non-custodial signing.  

Transactions are always **built server-side, signed client-side**, ensuring full user custody.

---

## 🔒 Safety Enhancements
- **Shield API** token risk checks.  
- Progressive security tiers.  
- Planned: whitelists + fallback routing.  

---

## 🧪 Competitive Landscape

| Bot       | Custodial | Open Source | Shield API | Public Good | Risk Profile |
|-----------|-----------|-------------|------------|-------------|--------------|
| **Cerberus** | ❌ Non-Custodial | ✅ Yes | ✅ Yes | ✅ Yes | Low |
| Trojan    | ✅ Yes | ❌ No | ❌ No | ❌ No | High |
| BONKbot   | ✅ Yes | ❌ No | ❌ No | ❌ No | High |
| Photon    | Mixed | ❌ No | ❌ No | ❌ No | Medium |

---

## 📊 Why Only Solana?

- **Sub-second finality** = real-time confirmations.  
- **Sealevel parallelism** = high-frequency transactions.  
- **Low fees** = micro-swaps feasible.  

---

## 🗺 Roadmap & Milestones

**Phase 1 – MVP (✅ Complete)**  
- API live  
- Telegram bot skeleton  
- Mini App bootstrap  
- Mainnet swap confirmed  

**Phase 2 – Optimizations**  
- Caching, parallel swaps, pre-fetch Shield checks  
- Fee tiers & optional priority execution  

**Phase 3 – Public Good Deliverable**  
- Open-source tutorial (docs + videos)  
- Example Mini App integrations  
- Release **analytics starter kit**  

**Phase 4 – Growth**  
- AI-powered wallet insights  
- Predictive token risk scoring  
- Personalized dashboards  
- Ecosystem partnerships  
- Multi-region deployments  

---

## 💰 Budget & Use of Funds

Request: **$10k – $25k**  

- Hosting & RPC infra  
- Documentation & tutorials  
- UX improvements  
- Educational content  
- Future AI/analytics R&D  

---

## 🤖 AI & Analytics: Future Vision
- Wallet insights (“diamond hand” vs “paper hand”).  
- Predictive token risk scoring.  
- Personalized trading dashboards.  

---

## 📜 License
Apache-2.0

---

## 🎯 Conclusion
Cerberus is a **public good, an educational resource, and a blueprint** for safe Solana integrations.  

By funding Cerberus, **Superteam directly supports a high-impact project** aligned with its mission: empowering builders, creating open-source public goods, and advancing the Solana ecosystem.  
