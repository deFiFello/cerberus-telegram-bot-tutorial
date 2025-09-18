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

// --- resilient API client ---------------------------------------------
const sleep = (n: number) => new Promise((r) => setTimeout(r, n));

/** Fetch with retries for 429/5xx; returns the Response */
async function apiFetch(
  path: string,
  qs: Record<string, string | number> = {},
  { retries = 4 }: { retries?: number } = {},
): Promise<Response> {
  const url = new URL(path, API_BASE);
  Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  let attempt = 0;
  // attempts: 0,1,2,3,4 => backoffs 0s,1s,2s,4s,8s
  while (true) {
    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json' } as any,
    });

    if (res.ok) return res;

    if (![429, 500, 502, 503, 504].includes(res.status) || attempt >= retries) {
      // bubble up non-retryable or exhausted
      return res;
    }
    await sleep(1000 * 2 ** attempt);
    attempt++;
  }
}

/** GET JSON with retries; throws if final response not ok */
async function apiGet<T>(
  path: string,
  qs: Record<string, string | number> = {},
  opts?: { retries?: number },
): Promise<T> {
  const res = await apiFetch(path, qs, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `API ${res.status} ${res.statusText} • ${path} • ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

// --- basic handlers ---------------------------------------------------
bot.start((ctx) => ctx.reply('Cerberus online'));

bot.help(async (ctx) => {
  const lines = [
    '*Cerberus — Commands*',
    '• `/ping` – latency check',
    '• `/quote <IN> <OUT> <AMOUNT>` – e.g. `/quote SOL USDC 0.001`',
    '• `/selftest` – verify API base, health, order, metrics',
    '• `/status` – uptime, requests, cache hit/miss, latency p50/p95',
    '',
    '_Non-custodial: you always sign in your wallet._',
  ];
  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
});

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

    const t0 = ms();
    const info: any = await apiGet('/order', {
      inputMint: inMint,
      outputMint: outMint,
      amount,
      slippageBps: 50,
    });
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
    const hRes = await apiFetch('/health');
    const hDt = elapsed(t0);
    checks.push(`✅ health ${hRes.status} in ${hDt}ms`);

    // order (SOL->USDC 0.001)
    t0 = ms();
    const orderJson: any = await apiGet('/order', {
      inputMint: MINT_SOL,
      outputMint: MINT_USDC,
      amount: 1_000_000,
      slippageBps: 50,
    });
    const oDt = elapsed(t0);
    checks.push(`✅ order 200 in ${oDt}ms`);

    // metrics
    t0 = ms();
    const mRes = await apiFetch('/metrics');
    const mDt = elapsed(t0);
    const metrics: any = await mRes.json().catch(() => ({}));
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
    const m: any = await apiGet('/metrics');

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
    // Set Telegram command list (visible in the client UI)
    await bot.telegram.setMyCommands([
      { command: 'ping',     description: 'Latency check' },
      { command: 'quote',    description: 'Swap quote: /quote IN OUT AMOUNT (e.g. /quote SOL USDC 0.001)' },
      { command: 'selftest', description: 'Call /health, /order, /metrics on the API' },
      { command: 'status',   description: 'Bot uptime, req count, cache hit/miss' },
      { command: 'help',     description: 'Show usage' },
      { command: 'swap',     description: 'Open the Mini App (web app)' },
    ]).catch(() => { /* ignore if bot lacks rights */ });

    await bot.launch();
    console.log('Bot is running');
  } catch (e) {
    console.error('Failed to launch bot:', e);
    process.exit(1);
  }
}
main();
