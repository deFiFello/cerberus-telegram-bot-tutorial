/**
 * Cerberus API proxy (Node 18+ / 20+ / 22+ with global fetch)
 *
 * Jupiter v6 (public):
 *   - Quote: GET  https://quote-api.jup.ag/v6/quote
 *   - Swap : POST https://quote-api.jup.ag/v6/swap
 *
 * NOTE: Do NOT send x-api-key to the quote-api endpoints.
 */
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// ---------- config ----------
const PORT        = parseInt(process.env.PORT || '4000', 10);

// Public quote API (correct for v6)
const QUOTE_BASE  = (process.env.QUOTE_BASE || 'https://quote-api.jup.ag').replace(/\/$/, '');

// Kept only for visibility in /health (not used for v6 quote/swap)
const LITE_BASE   = (process.env.LITE_BASE  || 'https://lite-api.jup.ag').replace(/\/$/, '');
const ULTRA_BASE  = (process.env.ULTRA_BASE || 'https://api.jup.ag/ultra').replace(/\/$/, '');
const ULTRA_KEY   = process.env.JUP_ULTRA_KEY || '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// ---------- helpers ----------
function contentTypeIsJSON(h: Headers | HeadersInit): boolean {
  // node fetch gives us a Headers object; fall back if someone passes a plain map
  const get = (h as Headers).get?.bind(h as Headers);
  const val = get ? get('content-type') : (h as Record<string, string>)['content-type'];
  return (val || '').toLowerCase().includes('application/json');
}

async function forwardJSON(res: express.Response, r: Response) {
    res.status(r.status);
  
    // Pass through a few safe headers
    r.headers.forEach((v, k) => {
      if (['cache-control', 'etag', 'content-type'].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });
  
    if (contentTypeIsJSON(r.headers)) {
      const j = await r.json().catch(() => null);
      res.json(j ?? { ok: false, status: r.status });
    } else {
      const t = await r.text().catch(() => '');
      res.json({ ok: r.ok, status: r.status, body: t });
    }
  }
  

function badRequest(res: express.Response, msg: string) {
  res.status(400).json({ code: 400, message: msg });
}

function requireParamStr(res: express.Response, obj: any, key: string): string | undefined {
  const v = obj?.[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  badRequest(res, `Param '${key}' required`);
  return undefined;
}

// ---------- jupiter v6 clients ----------
async function jupQuote(params: URLSearchParams) {
  const url = `${QUOTE_BASE}/v6/quote?${params.toString()}`;
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Quote failed: ${r.status} ${body}`);
  }
  return r.json();
}

async function jupBuildSwap(quoteResponse: any, userPublicKey: string, slippageBps: number) {
  const url = `${QUOTE_BASE}/v6/swap`;
  const body = {
    quoteResponse,
    userPublicKey,
    wrapAndUnwrapSol: true,
    slippageBps,
    asLegacyTransaction: false,
    prioritizationFeeLamports: 0,
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Swap build failed: ${r.status} ${t}`);
  }
  return r.json();
}

// ---------- routes ----------
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    quote: QUOTE_BASE,
    lite: LITE_BASE,
    ultra: ULTRA_BASE,
    ultraKey: Boolean(ULTRA_KEY),
  });
});

/**
 * /order
 * Required query: inputMint, outputMint, amount, slippageBps
 * Optional: buildTx (boolean/string), userPublicKey (required if buildTx=true)
 *
 * Examples:
 *  - Quote only:
 *      /order?inputMint=So1111...&outputMint=EPjF...&amount=1000000&slippageBps=50
 *  - Build tx:
 *      /order?inputMint=...&outputMint=...&amount=...&slippageBps=50&buildTx=true&userPublicKey=<BASE58>
 */
app.get('/order', async (req, res) => {
  try {
    const inputMint     = requireParamStr(res, req.query, 'inputMint');     if (!inputMint) return;
    const outputMint    = requireParamStr(res, req.query, 'outputMint');    if (!outputMint) return;
    const amount        = requireParamStr(res, req.query, 'amount');        if (!amount) return;
    const slippageBpsS  = requireParamStr(res, req.query, 'slippageBps');   if (!slippageBpsS) return;

    const slippageBps = Number(slippageBpsS);
    if (!Number.isFinite(slippageBps) || slippageBps < 0) {
      return badRequest(res, 'slippageBps must be a non-negative number');
    }

    const buildTx = String(req.query.buildTx ?? '').toLowerCase() === 'true';

    // 1) Quote
    const qs = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: String(slippageBps),
    });
    const quoteResponse = await jupQuote(qs);

    if (!buildTx) {
      return res.json(quoteResponse);
    }

    // 2) Build swap transaction (requires userPublicKey)
    const userPublicKey = requireParamStr(res, req.query, 'userPublicKey'); if (!userPublicKey) return;
    const swapResponse = await jupBuildSwap(quoteResponse, userPublicKey, slippageBps);
    return res.json(swapResponse);
  } catch (err: any) {
    const msg = (err && err.message) || String(err);
    return res.status(422).json({ code: 422, message: msg });
  }
});

/**
 * Optional endpoints from your previous file. The Lite API has drifted;
 * keep only if you still need them. They won’t affect /order.
 */

// Deprecated: lite search frequently 404s now
app.get('/search', (_req, res) => {
  res.status(404).json({ code: 404, message: 'Search endpoint deprecated on Lite API' });
});

app.get('/tokens', async (_req, res) => {
  try {
    const r = await fetch(`${LITE_BASE}/tokens`);
    return forwardJSON(res, r);
  } catch (e: any) {
    return res.status(502).json({ code: 502, message: e?.message || 'Upstream error' });
  }
});

app.get('/shield', async (req, res) => {
  const mints = requireParamStr(res, req.query, 'mints'); if (!mints) return;
  try {
    const r = await fetch(`${LITE_BASE}/shield?${new URLSearchParams({ mints })}`);
    return forwardJSON(res, r);
  } catch (e: any) {
    return res.status(502).json({ code: 502, message: e?.message || 'Upstream error' });
  }
});

// Fallback
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ---------- start ----------
app.listen(PORT, () => {
  console.log(`Cerberus API listening on :${PORT}`);
  console.log(`Quote base: ${QUOTE_BASE}`);
  console.log(`Lite base : ${LITE_BASE}`);
  console.log(`Ultra base: ${ULTRA_BASE}`);
  console.log(`Ultra key present: ${Boolean(ULTRA_KEY)}`);
});
