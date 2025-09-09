import 'dotenv/config';
import { Telegraf } from 'telegraf';

// --- env --------------------------------------------------------------
const token = process.env.TELEGRAM_TOKEN || '';
console.log('ENV token prefix:', token.slice(0, 12));

if (!token) {
  console.error('Missing TELEGRAM_TOKEN in bot/.env');
  process.exit(1);
}

// Hosted API base (prefer explicit API_BASE, else PUBLIC_WEB_URL, else tutorial host)
const API_BASE =
  process.env.API_BASE ||
  process.env.PUBLIC_WEB_URL ||
  'https://cerberus-telegram-bot-tutorial.onrender.com';

// Well-known mints
const MINT_SOL = 'So11111111111111111111111111111111111111112';
const MINT_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// --- bot --------------------------------------------------------------
const bot = new Telegraf(token);

// helpers
const ms = () => Date.now();
const elapsed = (t0: number) => Date.now() - t0;
const num = (v: unknown, d = 0) => Number(v ?? d);

// Convert human SOL (e.g., "0.001") -> lamports string when input is SOL mint
function toBaseUnits(amountTxt: string, inMint: string): string {
  const n = Number(amountTxt);
  if (!isFinite(n) || n <= 0) return '0';
  if (inMint === MINT_SOL) return Math.round(n * 1e9).toString(); // SOL -> lamports
  // Fall back: treat as already base units if not SOL
  return amountTxt;
}

function formatRoute(info: any) {
  try {
    const hops = Array.isArray(info?.routePlan) ? info.routePlan.length : 0;
    const labels =
      Array.isArray(info?.routePlan)
        ? info.routePlan.map((h: any) => h?.swapInfo?.label).filter(Boolean)
        : [];
    const labelStr = labels.join(' -> ') || 'n/a';
    return { hops, labelStr };
  } catch {
    return { hops: 0, labelStr: 'n/a' };
  }
}

// --- basic handlers ---------------------------------------------------
bot.start((ctx) => ctx.reply('Cerberus online'));
bot.help((ctx) =>
  ctx.reply(
    [
      'Commands:',
      '/ping',
      '/quote SOL USDC 0.001',
      '/selftest',
      '/status',
    ].join('\n'),
  ),
);

// /ping
bot.command('ping', async (ctx) => {
  const t0 = ms();
  await ctx.reply('pong');
  await ctx.reply(`ping ${elapsed(t0)}ms`);
});

// /quote <IN> <OUT> <AMOUNT>
bot.command('quote', async (ctx) => {
  try {
    const [, inSym = 'SOL', outSym = 'USDC', amtTxt = '0.001'] =
      (ctx.message as any)?.text?.split(/\s+/) ?? [];

    const inMint = inSym.toUpperCase() === 'SOL' ? MINT_SOL : inSym;
    const outMint = outSym.toUpperCase() === 'USDC' ? MINT_USDC : outSym;

    const amount = toBaseUnits(amtTxt, inMint);

    const url = `${API_BASE}/order?inputMint=${inMint}&outputMint=${outMint}&amount=${amount}&slippageBps=50`;

    const t0 = ms();
    const res = await fetch(encodeURI(url));
    const info: any = await res.json();
    const dt = elapsed(t0);

    const outAmount = info?.outAmount ?? '0';
    const { hops, labelStr } = formatRoute(info);

    await ctx.reply(
      [
        'Quote',
        `IN  : ${inSym.toUpperCase()} (${amount})`,
        `OUT : ${outSym.toUpperCase()} (${outAmount})`,
        `Route: ${labelStr} (${hops} ${hops === 1 ? 'hop' : 'hops'})`,
        `Latency: ${dt} ms`,
        'Non custodial. You sign in your wallet.',
      ].join('\n'),
    );
  } catch (e) {
    console.error('quote error', e);
    await ctx.reply('Quote error');
  }
});

// /selftest – hits /health, /order, /metrics and summarizes
bot.command('selftest', async (ctx) => {
  try {
    const checks: string[] = [];

    // env
    checks.push('✅ env TELEGRAM_TOKEN set');

    // health
    let t0 = ms();
    const h = await fetch(`${API_BASE}/health`);
    const hDt = elapsed(t0);
    checks.push(`✅ health ${h.status} in ${hDt}ms`);

    // order
    const url = `${API_BASE}/order?inputMint=${MINT_SOL}&outputMint=${MINT_USDC}&amount=1000000&slippageBps=50`;
    t0 = ms();
    const oRes = await fetch(url);
    const oDt = elapsed(t0);
    const orderJson: any = await oRes.json();
    checks.push(`✅ order ${oRes.status} in ${oDt}ms`);

    // metrics
    t0 = ms();
    const mRes = await fetch(`${API_BASE}/metrics`);
    const mDt = elapsed(t0);
    const metrics: any = await mRes.json();
    checks.push(`✅ metrics ${mRes.status} in ${mDt}ms`);

    const { hops, labelStr } = formatRoute(orderJson);
    const outAmount = orderJson?.outAmount ?? '0';

    await ctx.reply(
      [
        'Self-test',
        `✅ API ${API_BASE}`,
        ...checks,
        `route ${labelStr ? labelStr : ''}`.trim(),
        `hops ${hops}`,
        `outAmount ${outAmount}`,
        'Non custodial. You sign in your wallet.',
      ].join('\n'),
    );
  } catch (e) {
    console.error('selftest error', e);
    await ctx.reply('Self-test error');
  }
});

// /status – summarized metrics (base, cache hit rate, latency p50/p95, etc.)
bot.command('status', async (ctx) => {
  try {
    const r = await fetch(`${API_BASE}/metrics`);
    const m: any = await r.json();

    const hit = m?.order?.cache?.hit ?? 0;
    const miss = m?.order?.cache?.miss ?? 0;
    const rate = m?.order?.cache?.hitRate ?? 0;
    const p50 = m?.order?.latency?.p50 ?? 0;
    const p95 = m?.order?.latency?.p95 ?? 0;
    const req = m?.order?.requests ?? 0;
    const blocks = m?.order?.safetyBlocks ?? 0;
    const up = m?.uptimeSec ?? 0;

    await ctx.reply(
      [
        'Status',
        `Base: ${API_BASE}`,
        `Uptime: ${up}s`,
        `Req: ${req}`,
        `Cache: ${hit} hit, ${miss} miss, ${rate}%`,
        `Latency: p50 ${p50} ms, p95 ${p95} ms`,
        `Safety blocks: ${blocks}`,
      ].join('\n'),
    );
  } catch (e) {
    console.error('status command error', e);
    await ctx.reply('Status error');
  }
});

// Mini App launcher (kept as-is for your demo)
bot.command('swap', async (ctx) => {
  const [, i = 'SOL', o = 'USDC', a = '0.001'] =
    (ctx.message as any)?.text?.split(/\s+/) ?? [];
  const miniUrl = `${process.env.PUBLIC_WEB_URL || API_BASE}/app?in=${encodeURIComponent(
    i,
  )}&out=${encodeURIComponent(o)}&amt=${encodeURIComponent(a)}`;

  await ctx.reply('Open Cerberus Mini App to sign', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open Mini App', web_app: { url: miniUrl } }]],
    },
  });
});

// error surface
process.on('unhandledRejection', (e) => {
  console.error('UnhandledRejection:', e);
});
process.on('uncaughtException', (e) => {
  console.error('UncaughtException:', e);
});

// main
async function main() {
  try {
    await bot.launch();
    console.log('Bot is running');
  } catch (e) {
    console.error('Failed to launch bot:', e);
    process.exit(1);
  }
}
main();
