import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { TTLCache, quoteKey } from './lib/quoteCache.js';

/* ============================ Config ============================ */

const PORT = Number(process.env.PORT || 4000);

// Primary & fallback quote bases (Jupiter anycast + backup host)
const QUOTE_BASES: string[] = (
  process.env.QUOTE_BASES ||
  process.env.QUOTE_BASE ||            // allow single value
  'https://quote-api.jup.ag,https://quote-api.mainnet.jup.ag'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Swap endpoints (unchanged)
const LITE_SWAP  = process.env.LITE_SWAP  || 'https://api.jup.ag/swap/v1/swap';
const V6_SWAP    = process.env.V6_SWAP    || 'https://api.jup.ag/v6/swap';
const USE_V6    = String(process.env.USE_V6_SWAP || '') === 'true';
const JUP_ULTRA_KEY = process.env.JUP_ULTRA_KEY || '';

// CORS allow-list (unset = allow all)
const ORIGINS = (process.env.WEB_ORIGINS || process.env.WEB_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const ALLOW_ALL = ORIGINS.length === 0;

// short TTL: avoid stale quotes but give UI a little breathing room
const quoteCache = new TTLCache<any>(3_000);

/* ============================ App ============================ */

const app = express();

const corsOptions: CorsOptions = ALLOW_ALL
  ? { origin: true, credentials: false }
  : {
      origin(origin: string | undefined, cb) {
        if (!origin) return cb(null, true);
        if (ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error('CORS: origin not allowed'));
      },
      credentials: false,
    };

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '512kb' }));

/* ============================ Helpers ============================ */

async function fetchText(url: string, init?: any) {
  const r = await fetch(url, init as any);
  const text = await r.text().catch(() => '');
  return { ok: r.ok, status: r.status, text };
}

type FetchJsonOK<T>    = { ok: true; status: number; data: T };
type FetchJsonError    = { ok: false; status: number; error: string };
type FetchJsonResult<T> = FetchJsonOK<T> | FetchJsonError;

async function fetchJson<T = any>(url: string, init?: any): Promise<FetchJsonResult<T>> {
  const r = await fetchText(url, init);
  if (!r.ok) return { ok: false, status: r.status, error: r.text || `HTTP ${r.status}` };
  try {
    return { ok: true, status: r.status, data: JSON.parse(r.text) as T };
  } catch {
    return { ok: false, status: 502, error: `non_json_upstream_body:${r.text.slice(0, 200)}` };
  }
}

function isDigits(x: string): boolean {
  return /^[0-9]+$/.test(x);
}

function looksLikeBase58Pubkey(x: string): boolean {
  if (!x || x.length < 32 || x.length > 64) return false;
  if (/[0OIl]/.test(x)) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(x);
}

function normalizeSwapTx(obj: any): string | '' {
  if (!obj || typeof obj !== 'object') return '';
  // prefer unsigned, but accept whatever field exists
  return obj.swapTransaction || obj.transaction || obj.signedTransaction || obj.tx || '';
}

function sendCacheHeaders(res: Response, hit: boolean): void {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-cache', hit ? 'HIT' : 'MISS');
}

/** Retry helper with backoff */
async function withRetry<T>(
  fn: () => Promise<FetchJsonResult<T>>,
  opts: { tries?: number; baseDelayMs?: number } = {}
): Promise<FetchJsonResult<T>> {
  const tries = Math.max(1, opts.tries ?? 3);
  const base  = Math.max(50, opts.baseDelayMs ?? 120);

  let last: FetchJsonResult<T> | undefined;
  for (let i = 0; i < tries; i++) {
    // linear backoff (120ms, 240ms, 360ms)
    if (i) await new Promise(r => setTimeout(r, base * i));
    last = await fn();
    if (last.ok) return last;
    // retry only on transient-ish upstream issues
    const transient = [429, 500, 502, 503, 504].includes(last.status);
    if (!transient) break;
  }
  return last!;
}

/** Try each QUOTE_BASE in order, each with retry/backoff */
async function getQuoteResilient<T = any>(qs: URLSearchParams): Promise<FetchJsonResult<T>> {
  const ua = 'cerberus-proxy/1.0 (+https://github.com/deFiFello/cerberus-telegram-bot-tutorial)';
  for (let i = 0; i < QUOTE_BASES.length; i++) {
    const base = QUOTE_BASES[i].replace(/\/+$/, '');
    const url  = `${base}/v6/quote?${qs.toString()}`;
    const r = await withRetry<T>(
      () =>
        fetchJson<T>(url, {
          headers: { 'accept': 'application/json', 'user-agent': ua },
        }),
      { tries: 3, baseDelayMs: 120 }
    );
    if (r.ok) return r;
    // log once per base to Render logs for visibility
    console.warn(`[quote] upstream ${base} failed ${r.status}: ${('error' in r && r.error) || ''}`);
  }
  return { ok: false, status: 502, error: 'all_quote_backends_failed' };
}

/* ============================ Routes ============================ */

app.get('/', (_req, res) => {
  res
    .type('text/plain')
    .send(
      [
        'Cerberus API',
        'GET /health   (and /healthz, HEAD allowed)',
        'GET /order?inputMint&outputMint&amount&slippageBps[&buildTx=true&userPublicKey=...]',
        'GET /tokens',
        'GET /shield?mints=<mint1,mint2>',
      ].join('\n')
    );
});

// Health (for Render checks) — support /health & /healthz and HEAD
const healthHandler = (_req: Request, res: Response) => {
  sendCacheHeaders(res, false);
  res.json({ ok: true, status: 'healthy', time: Date.now() });
};
app.get(['/health', '/healthz'], healthHandler);
app.head(['/health', '/healthz'], (_req, res) => {
  sendCacheHeaders(res, false);
  res.status(200).end();
});

// Token list passthrough
app.get('/tokens', async (_req, res) => {
  const j = await fetchJson('https://lite-api.jup.ag/tokens', { headers: { accept: 'application/json' } });
  if (!j.ok) return res.status(j.status).json({ ok: false, error: j.error });
  sendCacheHeaders(res, false);
  res.json(j.data);
});

// Optional shield passthrough
app.get('/shield', async (req, res) => {
  const mints = String(req.query.mints || '').trim();
  const shieldBase = process.env.SHIELD_BASE || '';
  if (!mints) return res.status(400).json({ ok: false, error: 'missing_mints' });
  if (!shieldBase) return res.status(501).json({ ok: false, error: 'SHIELD_BASE not configured' });

  const j = await fetchJson(`${shieldBase}?mints=${encodeURIComponent(mints)}`, { headers: { accept: 'application/json' } });
  if (!j.ok) return res.status(j.status).json({ ok: false, error: j.error });
  sendCacheHeaders(res, false);
  res.json(j.data);
});

// Quote (+ optional build)
app.get('/order', async (req: Request, res: Response) => {
  const inputMint   = String(req.query.inputMint || '');
  const outputMint  = String(req.query.outputMint || '');
  const amount      = String(req.query.amount || '');
  const slippageBps = String(req.query.slippageBps || '');
  const buildTx     = String(req.query.buildTx || '') === 'true';
  const userPublicKey = String(req.query.userPublicKey || '');

  // Validate
  if (!inputMint || !outputMint || !amount || !slippageBps) {
    return res.status(400).json({ ok: false, error: 'missing_params' });
  }
  if (!isDigits(amount) || !isDigits(slippageBps)) {
    return res.status(400).json({ ok: false, error: 'invalid_number' });
  }
  if (buildTx && !looksLikeBase58Pubkey(userPublicKey)) {
    return res.status(400).json({ ok: false, error: 'invalid_userPublicKey' });
  }

  const baseKey = quoteKey({ inputMint, outputMint, amount, slippageBps });
  const key = buildTx ? `${baseKey}|build:${userPublicKey}` : baseKey;

  const cached = quoteCache.get(key);
  if (cached) {
    sendCacheHeaders(res, true);
    return res.json(cached);
  }

  // Resilient quote (retry + fallback)
  const qs = new URLSearchParams({ inputMint, outputMint, amount, slippageBps });
  const quoteResp = await getQuoteResilient<any>(qs);

  if (!quoteResp.ok) {
    sendCacheHeaders(res, false);
    return res.status(quoteResp.status).json({ ok: false, error: quoteResp.error });
  }

  let payload: any = quoteResp.data;

  if (buildTx) {
    const swapBody: Record<string, any> = {
      quoteResponse: payload,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicSlippage: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: { priorityLevel: 'high', maxLamports: 1_000_000 },
      },
    };

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const swapUrl = USE_V6 ? V6_SWAP : LITE_SWAP;
    if (USE_V6 && JUP_ULTRA_KEY) headers['x-api-key'] = JUP_ULTRA_KEY;

    const swapResp = await fetchJson<any>(swapUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(swapBody),
    });

    if (!swapResp.ok) {
      sendCacheHeaders(res, false);
      return res.status(swapResp.status).json({ ok: false, error: swapResp.error });
    }

    const txAny = normalizeSwapTx(swapResp.data);
    if (!txAny) {
      console.error('Jupiter swap returned 200 but no tx field', { keys: Object.keys(swapResp.data || {}) });
      sendCacheHeaders(res, false);
      return res.status(502).json({ ok: false, error: 'no_swap_tx_from_jupiter' });
    }

    payload = { ...payload, swapTransaction: txAny };
    if (!payload.tx) payload.tx = txAny; // compat for older clients expecting `tx`
  }

  quoteCache.set(key, payload);
  sendCacheHeaders(res, false);
  res.json(payload);
});

/* ============================ Error Handler ============================ */

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error', err);
  const status = Number(err?.status || 500);
  res.status(Number.isFinite(status) ? status : 500).json({ ok: false, error: 'internal_error' });
});

/* ============================ Listen ============================ */

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Cerberus API listening on :${PORT}`);
    console.log(ALLOW_ALL ? 'CORS: allowing all origins' : `CORS allow-list: ${ORIGINS.join(', ')}`);
    console.log(`Quote backends: ${QUOTE_BASES.join(' , ')}`);
  });
}
