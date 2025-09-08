import 'dotenv/config';
import express, { Request, Response } from 'express';
import { TTLCache, quoteKey } from './lib/quoteCache.js'; // ESM: include .js

// ---------- Config ----------
const PORT = Number(process.env.PORT || 4000);
const QUOTE_BASE = process.env.QUOTE_BASE || 'https://quote-api.jup.ag';
const LITE_BASE  = process.env.LITE_BASE  || 'https://lite-api.jup.ag';
const ULTRA_BASE = process.env.ULTRA_BASE || 'https://api.jup.ag/ultra';
const JUP_ULTRA_KEY = process.env.JUP_ULTRA_KEY || '';

// ---------- Cache ----------
const quoteCache = new TTLCache<any>(500, 15_000); // 15s TTL, 500 entries

// ---------- Metrics ----------
const metrics = {
  startedAt: Date.now(),
  order: {
    requests: 0,
    cache: { hit: 0, miss: 0 },
    latencyMs: [] as number[],
  },
};
function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (s.length - 1));
  return s[idx];
}
function snapshot() {
  const lat = metrics.order.latencyMs;
  return {
    uptimeSec: Math.floor((Date.now() - metrics.startedAt) / 1000),
    order: {
      requests: metrics.order.requests,
      cache: metrics.order.cache,
      latencyMs: { p50: percentile(lat, 50), p95: percentile(lat, 95) },
    },
  };
}

// ---------- App ----------
export const app = express(); // export for tests
app.set('trust proxy', true);
app.use(express.json());

// ---------- Helpers ----------
async function fetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: any }> {
  const r = await fetch(url, init as any);
  if (!r.ok) {
    let body: any = undefined;
    try { body = await r.text(); } catch {}
    return { ok: false, status: r.status, error: body || `HTTP ${r.status}` };
  }
  return { ok: true, status: r.status, data: (await r.json()) as T };
}

// ---------- Routes ----------
app.get('/', (_req, res) => {
  res.type('text/plain').send(
    [
      'Cerberus API',
      '',
      'GET /health',
      'GET /order?inputMint&outputMint&amount&slippageBps[&buildTx=true&userPublicKey=...]',
      'GET /metrics',
      'GET /tokens',
      'GET /shield?mints=<mint1,mint2>',
    ].join('\n')
  );
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    quoteBase: QUOTE_BASE,
    liteBase: LITE_BASE,
    ultraBase: ULTRA_BASE,
    cache: { enabled: true, kind: 'ttl-inproc', ttlMs: 15_000, max: 500 },
    time: new Date().toISOString(),
  });
});

app.get('/metrics', (_req, res) => {
  res.json(snapshot());
});

app.get('/tokens', async (_req, res) => {
  const url = `${LITE_BASE}/tokens`;
  const { ok, status, data, error } = await fetchJson(url);
  if (!ok) return res.status(status).json({ ok: false, error });
  res.json(data);
});

app.get('/shield', async (req, res) => {
  const mints = String(req.query.mints || '').trim();
  const shieldBase = process.env.SHIELD_BASE; // optional
  if (!mints) return res.status(400).json({ ok: false, error: 'missing mints' });
  if (!shieldBase) return res.status(501).json({ ok: false, error: 'SHIELD_BASE not configured' });

  const url = `${shieldBase}?mints=${encodeURIComponent(mints)}`;
  const { ok, status, data, error } = await fetchJson(url);
  if (!ok) return res.status(status).json({ ok: false, error });
  res.json(data);
});

app.get('/order', async (req: Request, res: Response) => {
  metrics.order.requests++;
  const t0 = Date.now();

  const inputMint     = String(req.query.inputMint || '');
  const outputMint    = String(req.query.outputMint || '');
  const amount        = String(req.query.amount || '');
  const slippageBps   = String(req.query.slippageBps || '');
  const buildTx       = String(req.query.buildTx || '') === 'true';
  const userPublicKey = String(req.query.userPublicKey || '');

  if (!inputMint || !outputMint || !amount || !slippageBps) {
    return res.status(400).json({ ok: false, error: 'missing required params: inputMint, outputMint, amount, slippageBps' });
  }
  if (buildTx && !userPublicKey) {
    return res.status(400).json({ ok: false, error: 'buildTx=true requires userPublicKey' });
  }

  const key = quoteKey({ inputMint, outputMint, amount, slippageBps });

  // Cache first
  const cached = quoteCache.get(key);
  if (cached) {
    metrics.order.cache.hit++;
    metrics.order.latencyMs.push(Date.now() - t0);
    res.setHeader('x-cache', 'HIT');
    return res.json(cached);
  }

  // Upstream quote
  const qs = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps,
  });
  const quoteUrl = `${QUOTE_BASE}/v6/quote?${qs.toString()}`;
  const quoteResp = await fetchJson<any>(quoteUrl);
  if (!quoteResp.ok) {
    metrics.order.latencyMs.push(Date.now() - t0);
    res.setHeader('x-cache', 'MISS');
    return res.status(quoteResp.status).json({ ok: false, error: quoteResp.error });
  }

  let payload: any = quoteResp.data;

  if (buildTx) {
    const swapUrl = `${QUOTE_BASE}/v6/swap`;
    const swapBody = {
      quoteResponse: payload,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicSlippage: false,
      prioritizationFeeLamports: undefined,
    };
    const swapResp = await fetchJson<any>(swapUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(swapBody),
    });
    if (!swapResp.ok) {
      metrics.order.latencyMs.push(Date.now() - t0);
      res.setHeader('x-cache', 'MISS');
      return res.status(swapResp.status).json({ ok: false, error: swapResp.error });
    }
    payload = { ...payload, swapTransaction: swapResp.data?.swapTransaction };
  }

  // Store & return
  quoteCache.set(key, payload);
  metrics.order.cache.miss++;
  metrics.order.latencyMs.push(Date.now() - t0);
  res.setHeader('x-cache', 'MISS');
  return res.json(payload);
});

// ---------- Start server (skip in tests) ----------
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Cerberus API listening on :${PORT}`);
  });
}
