// api/src/server.ts
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { TTLCache, quoteKey } from './lib/quoteCache.js'; // ESM: include .js

// ---------- Config ----------
const PORT = Number(process.env.PORT || 4000);

// Jupiter endpoints
const QUOTE_BASE = process.env.QUOTE_BASE || 'https://quote-api.jup.ag';
const LITE_BASE  = process.env.LITE_BASE  || 'https://lite-api.jup.ag';
const ULTRA_BASE = process.env.ULTRA_BASE || 'https://api.jup.ag/ultra';
const JUP_ULTRA_KEY = process.env.JUP_ULTRA_KEY || '';

// Web origin allow-list (CORS). Accepts either WEB_ORIGIN (single) or WEB_ORIGINS (comma list).
const ORIGINS = (
  process.env.WEB_ORIGINS ||
  process.env.WEB_ORIGIN ||
  ''
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Denylist for demo safety gate
const DENY_MINTS = new Set(
  (process.env.DENY_MINTS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

// ---------- Cache ----------
const quoteCache = new TTLCache<any>(500, 15_000); // 15s TTL, 500 entries

// ---------- Metrics ----------
const metrics = {
  startedAt: Date.now(),
  order: {
    requests: 0,
    safetyBlocks: 0,
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
  const hit = metrics.order.cache.hit;
  const miss = metrics.order.cache.miss;
  const total = hit + miss;
  const hitRate = total ? +(hit * 100 / total).toFixed(1) : 0;

  return {
    uptimeSec: Math.floor((Date.now() - metrics.startedAt) / 1000),
    order: {
      requests: metrics.order.requests,
      cache: { hit, miss, hitRate },
      latency: { p50: percentile(lat, 50), p95: percentile(lat, 95) },
      safetyBlocks: metrics.order.safetyBlocks
    },
  };
}

// ---------- App ----------
export const app = express(); // export for tests
app.set('trust proxy', true);

// CORS with allow-list (if no origins are set, allow all; curl/no-origin is allowed).
const allowAll = ORIGINS.length === 0;
const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (allowAll || !origin) return cb(null, true);
    return cb(null, ORIGINS.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['content-type', 'authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// ---------- Helpers ----------
async function fetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: any }> {
  const r = await fetch(url, init as any);
  if (!r.ok) {
    let body: any = undefined;
    try { body = await r.text(); } catch {}
    return { ok: false, status: r.status, error: body || `HTTP ${r.status}` };
  }
  const data = (await r.json()) as T;
  return { ok: true, status: r.status, data };
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
  res.setHeader('cache-control', 'no-store');
  res.json({
    ok: true,
    quoteBase: QUOTE_BASE,
    liteBase: LITE_BASE,
    ultraBase: ULTRA_BASE,
    cache: { enabled: true, kind: 'ttl-inproc', ttlMs: 15_000, max: 500 },
    cors: { allowAll, origins: ORIGINS },
    time: new Date().toISOString(),
  });
});

app.get('/metrics', (_req, res) => {
  res.setHeader('cache-control', 'no-store');
  res.json(snapshot());
});

app.get('/tokens', async (_req, res) => {
  const url = `${LITE_BASE}/tokens`;
  const resp = await fetchJson(url);
  if (!resp.ok) return res.status(resp.status).json({ ok: false, error: resp.error });
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-cache', 'MISS');
  res.json(resp.data);
});

app.get('/shield', async (req, res) => {
  const mints = String(req.query.mints || '').trim();
  const shieldBase = process.env.SHIELD_BASE; // optional
  if (!mints) return res.status(400).json({ ok: false, error: 'missing mints' });
  if (!shieldBase) return res.status(501).json({ ok: false, error: 'SHIELD_BASE not configured' });

  const url = `${shieldBase}?mints=${encodeURIComponent(mints)}`;
  const resp = await fetchJson(url);
  if (!resp.ok) return res.status(resp.status).json({ ok: false, error: resp.error });
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-cache', 'MISS');
  res.json(resp.data);
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
    return res.status(400).json({
      ok: false,
      error: 'missing required params: inputMint, outputMint, amount, slippageBps'
    });
  }
  if (buildTx && !userPublicKey) {
    return res.status(400).json({ ok: false, error: 'buildTx=true requires userPublicKey' });
  }

  // Safety gate (demo denylist)
  if (DENY_MINTS.has(inputMint) || DENY_MINTS.has(outputMint)) {
    metrics.order.safetyBlocks++;
    return res.status(403).json({
      error: 'blocked_by_safety_gate',
      reason: 'denylist',
      mints: { inputMint, outputMint }
    });
  }

  const key = quoteKey({ inputMint, outputMint, amount, slippageBps });

  // Cache first
  const cached = quoteCache.get(key);
  if (cached) {
    metrics.order.cache.hit++;
    metrics.order.latencyMs.push(Date.now() - t0);
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-cache', 'HIT');
    return res.json(cached);
  }

  // Upstream quote
  const qs = new URLSearchParams({ inputMint, outputMint, amount, slippageBps });
  const quoteUrl = `${QUOTE_BASE}/v6/quote?${qs.toString()}`;
  const quoteResp = await fetchJson<any>(quoteUrl);
  if (!quoteResp.ok) {
    metrics.order.latencyMs.push(Date.now() - t0);
    res.setHeader('cache-control', 'no-store');
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
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(JUP_ULTRA_KEY ? { 'x-api-key': JUP_ULTRA_KEY } : {}),
    };
    const swapResp = await fetchJson<any>(swapUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(swapBody),
    });
    if (!swapResp.ok) {
      metrics.order.latencyMs.push(Date.now() - t0);
      res.setHeader('cache-control', 'no-store');
      res.setHeader('x-cache', 'MISS');
      return res.status(swapResp.status).json({ ok: false, error: swapResp.error });
    }

    // Include the built tx; Jupiter returns base64 under `swapTransaction`.
    payload = {
      ...payload,
      swapTransaction: swapResp.data?.swapTransaction,
    };
    // Convenience alias so frontends can read either `tx` or `swapTransaction`
    if (payload.swapTransaction && !payload.tx) {
      payload.tx = payload.swapTransaction;
    }
  }

  // Store & return
  quoteCache.set(key, payload);
  metrics.order.cache.miss++;
  metrics.order.latencyMs.push(Date.now() - t0);
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-cache', 'MISS');
  return res.json(payload);
});

// ---------- Basic error -> JSON ----------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.message?.toLowerCase().includes('cors')) {
    return res.status(403).json({ ok: false, error: 'cors_not_allowed' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'internal_error' });
});

// ---------- Start server (skip in tests) ----------
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Cerberus API listening on :${PORT}`);
    if (allowAll) {
      console.log('CORS: allowing all origins');
    } else {
      console.log('CORS allow-list:', ORIGINS);
    }
  });
}
