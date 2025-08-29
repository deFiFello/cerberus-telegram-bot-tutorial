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

Together, these components form a blueprint for safe Solana trading in consumer apps.

---

## ✅ Proof of Work

Cerberus is **live and tested on mainnet**:

- **API deployed on Render**: [https://cerberus-telegram-bot-tutorial.onrender.com](https://cerberus-telegram-bot-tutorial.onrender.com)  
- `/health` endpoint returns configured Jupiter bases  
- `/order` successfully quotes swaps  
- **BuildTx** confirmed with a valid serialized transaction payload  
- **Mainnet swap executed successfully** (confirmed via Solana Explorer)  
- **Public repository**: [github.com/deFiFello/cerberus-telegram-bot-tutorial](https://github.com/deFiFello/cerberus-telegram-bot-tutorial)  

👉 This is the **sole official repository** for Cerberus.

Screenshots and transaction proofs are included in the repo as **appendix PDF (“Cerberus Proof of Work”)**.

---

## 📐 Technical Architecture

- **Node Proxy (API)**  
  - Wraps Jupiter v6 Quote (`/quote`) and Swap (`/swap`) endpoints.  
  - Adds optional Shield API checks for token safety.  
  - Enforces non-custodial flow: transactions are built server-side but **always signed client-side**.  

- **Telegram Bot**  
  - Uses Telegraf for command handling.  
  - Calls API proxy for quotes.  
  - Generates Mini App deep links for transaction approval.  

- **Mini App (Web)**  
  - Built with Next.js.  
  - Integrates Solana wallet adapter for seamless signing.  
  - Provides UI for swap parameters, confirmation, and error reporting.  

This architecture is safe, modular, and easily extendable by other developers.

---

## 🔒 Safety Enhancements

Cerberus builds user trust by combining non-custodial signing with safety layers:
- **Shield API**: real-time token risk checks.  
- **Progressive security**: stricter checks for larger trades.  
- **Whitelist mode** (planned): allow swaps only on vetted tokens.  
- **Fallback routing**: ensures continuity if Jupiter endpoints experience downtime.

---

## 🧪 Competitive Landscape

| Bot       | Custodial | Open Source | Shield API | Public Good | Risk Profile |
|-----------|-----------|-------------|------------|-------------|--------------|
| **Cerberus** | ❌ Non-Custodial | ✅ Yes | ✅ Yes | ✅ Yes | Low |
| Trojan    | ✅ Yes | ❌ No | ❌ No | ❌ No | High |
| BONKbot   | ✅ Yes | ❌ No | ❌ No | ❌ No | High |
| Photon    | Mixed | ❌ No | ❌ No | ❌ No | Medium |

Cerberus is the only **open-source, non-custodial, safety-first** option available.

---

## 📊 Why Only Solana?

Cerberus is only possible on Solana because:
- **Sub-second finality** enables real-time swap confirmations.  
- **Parallel transaction processing (Sealevel runtime)** supports high-frequency trading.  
- **Low fees** make micro-swaps feasible and attractive.  

This combination makes Solana uniquely suited for consumer bots and Mini Apps.

---

## 🗺 Roadmap & Milestones

**Phase 1 – MVP (✅ Complete)**  
- API proxy live  
- Telegram bot skeleton running  
- Mini App bootstrap completed  
- Mainnet swap confirmed  

**Phase 2 – Optimizations**  
- Local caching of quotes for frequent pairs  
- Parallel swap execution  
- Pre-fetch Shield safety data  
- Fee tiers + optional priority execution  

**Phase 3 – Public Good Deliverable**  
- Full open-source tutorial (docs + video walkthroughs)  
- Example Mini App integrations  
- Release **analytics starter kit** (basic on-chain trade history analysis)  

**Phase 4 – Growth**  
- AI-powered wallet insights (“diamond hand” vs “paper hand” classification)  
- Predictive token risk scoring (real-time ML applied to Shield + market data)  
- Personalized trading dashboards for advanced users  
- Partnerships with Jupiter & Solana ecosystem projects  
- Multi-region deployments for latency reduction  

---

## 💰 Budget & Use of Funds

Request: **$10,000 – $25,000** (solo builder, open-source deliverable)

Allocation:
- Hosting (Render, RPC providers)  
- Documentation & tutorial creation  
- UX improvements (Mini App polish)  
- Educational content (video + written guides)  
- Future AI/analytics R&D (foundation for Phase 4)  

---

## 🤖 AI & Analytics: A Vision for the Future

Cerberus already uses Shield API for static token checks.  
The next step is **AI-powered analytics** to make trading smarter and safer:

- **Wallet Insights**: Analyze trading history to profile user behavior.  
- **Predictive Risk Scoring**: Forecast token risk using real-time data.  
- **Personalized Analytics**: Provide dashboards with data-driven trading suggestions.  

These tools will be built **open-source first** (Phase 3 analytics framework) and extended in Phase 4 for growth.  
This directly aligns with Solana Foundation and Superteam’s increasing focus on AI-powered projects.

---

## 📜 License

Apache-2.0 — free for anyone to use, fork, and extend.

---

## 🙌 Acknowledgements

- [Jupiter Aggregator](https://jup.ag)  
- [Solana Foundation](https://solana.org)  
- [Telegram Bot API](https://core.telegram.org/bots/api)  

---

## 🎯 Conclusion

Cerberus is more than a trading bot. It is a **public good, an educational resource, and a blueprint** for safe Solana integrations.  

By funding Cerberus, **Superteam will directly support a high-impact project** that aligns with its mission:  
empowering Solana builders, creating open-source public goods, and advancing community-driven innovation.

---
