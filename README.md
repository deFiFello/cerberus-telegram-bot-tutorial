# Cerberus: Solana Telegram Bot Tutorial

## Goal
Teach devs how to build a safe, non-custodial Telegram swap bot and Mini App on Solana using **Jupiter Ultra** and **Shield**.

**What you get**
- Telegraf Telegram bot
- Next.js Mini App for non-custodial signing with Wallet Adapter
- Minimal Node API that calls Ultra `/order` and Shield `/shield`
- Clear setup and deployment steps

---

## Why Cerberus?
- **Non-custodial** → safer than custodial bots like Trojan or Bonkbot  
- **Public good** → fully open-source template for Solana builders  
- **Ecosystem aligned** → integrates directly with Jupiter v6 + Shield API, driving Solana adoption and volume  

---

## Demo Transaction
A mainnet swap executed via Cerberus:  
[View on Solana Explorer](https://explorer.solana.com/tx/3xFg53XToTnHBaPpRoJw27Th5uspPU739SnKnEYdJZ2UShtCuTFiN5RFw7mbyGh5UY4j1A2P8RFhZp9AUcXLut7s?cluster=mainnet)

---

## Repo Layout
/bot # Telegraf bot commands
/api # Ultra + Shield API endpoints
/web # Next.js Mini App (wallet connect + swap UI)

---

## Quick start
1. Create a Telegram bot with **@BotFather**. Save the token.  
2. Get a Jupiter **Ultra API key**.  
3. Create `.env` files in each package. Values listed in the package READMEs.  
4. Run each package with `npm run dev`.  

---

## Roadmap
- **Phase 1 (✅ Complete)**: MVP bot + API, successful mainnet swap executed  
- **Phase 2 (Grant support)**: UX + infra optimizations, caching, concurrent swaps, shield pre-fetch  
- **Phase 3**: Institutional tier, volume-based fees, partnerships, multi-region infra  

---

## License
Apache-2.0
