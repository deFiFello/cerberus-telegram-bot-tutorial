import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { TTLCache, quoteKey } from './lib/quoteCache.js'; // your project expects .js with Node16/NodeNext

const PORT = Number(process.env.PORT || 4000);
const QUOTE_BASE = process.env.QUOTE_BASE || 'https://quote-api.jup.ag';
const LITE_SWAP  = process.env.LITE_SWAP  || 'https://lite-api.jup.ag/swap/v1/swap';
const V6_SWAP    = process.env.V6_SWAP    || `${QUOTE_BASE}/v6/swap`;
const JUP_ULTRA_KEY = process.env.JUP_ULTRA_KEY || '';

const ORIGINS = (process.env.WEB_ORIGINS || process.env.WEB_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const allowAll = ORIGINS.length === 0;

const quoteCache = new TTLCache<any>(3_000); // 3s TTL

const app = express();
const corsOptions: cors.CorsOptions = allowAll
  ? { origin: true, credentials: false }
  : {
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('CORS: origin not allowed'));
      },
      credentials: false,
    };
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

async function fetchText(url: string, init?: RequestInit) {
  const r = await fetch(url, init as any);
  const text = await r.text().catch(() => '');
  return { ok: r.ok, status: r.status, text };
}
async function fetchJson<T=any>(url: string, init?: RequestInit):
  Promise<{ok:true;status:number;data:T}|{ok:false;status:number;error:any}> {
  const r = await fetchText(url, init);
  if (!r.ok) return { ok:false, status:r.status, error: r.text || `HTTP ${r.status}` };
  try { return { ok:true, status:r.status, data: JSON.parse(r.text) as T }; }
  catch { return { ok:false, status:502, error: `non_json_upstream_body:${r.text.slice(0,200)}` }; }
}
function isDigits(x: string){ return /^[0-9]+$/.test(x); }
function looksLikeBase58Pubkey(x: string){
  if (!x || x.length < 32 || x.length > 64) return false;
  if (/[0OIl]/.test(x)) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(x);
}
function normalizeSwapTx(obj: any): string|'' {
  if (!obj || typeof obj!=='object') return '';
  return obj.swapTransaction || obj.transaction || obj.signedTransaction || obj.tx || '';
}
function sendCacheHeaders(res: Response, hit: boolean){
  res.setHeader('cache-control','no-store');
  res.setHeader('x-cache', hit?'HIT':'MISS');
}

app.get('/', (_req,res) => {
  res.type('text/plain').send([
    'Cerberus API',
    'GET /health',
    'GET /order?inputMint&outputMint&amount&slippageBps[&buildTx=true&userPublicKey=...]',
    'GET /tokens',
    'GET /shield?mints=<mint1,mint2>',
  ].join('\n'));
});

app.get('/health', (_req,res) => {
  sendCacheHeaders(res,false);
  res.json({ ok:true, status:'healthy', time: Date.now() });
});

app.get('/tokens', async (_req,res) => {
  const j = await fetchJson('https://lite-api.jup.ag/tokens');
  if (!j.ok) return res.status(j.status).json({ ok:false, error:j.error });
  sendCacheHeaders(res,false);
  res.json(j.data);
});

app.get('/shield', async (req,res) => {
  const mints = String(req.query.mints || '').trim();
  const shieldBase = process.env.SHIELD_BASE || '';
  if (!mints) return res.status(400).json({ ok:false, error:'missing mints' });
  if (!shieldBase) return res.status(501).json({ ok:false, error:'SHIELD_BASE not configured' });
  const j = await fetchJson(`${shieldBase}?mints=${encodeURIComponent(mints)}`);
  if (!j.ok) return res.status(j.status).json({ ok:false, error:j.error });
  sendCacheHeaders(res,false);
  res.json(j.data);
});

// Quote + optional build
app.get('/order', async (req: Request, res: Response) => {
  const inputMint     = String(req.query.inputMint || '');
  const outputMint    = String(req.query.outputMint || '');
  const amount        = String(req.query.amount || '');
  const slippageBps   = String(req.query.slippageBps || '');
  const buildTx       = String(req.query.buildTx || '') === 'true';
  const userPublicKey = String(req.query.userPublicKey || '');

  if (!inputMint || !outputMint || !amount || !slippageBps) {
    return res.status(400).json({ ok:false, error:'missing_params' });
  }
  if (!isDigits(amount) || !isDigits(slippageBps)) {
    return res.status(400).json({ ok:false, error:'invalid_number' });
  }
  if (buildTx && !looksLikeBase58Pubkey(userPublicKey)) {
    return res.status(400).json({ ok:false, error:'invalid_userPublicKey' });
  }

  const baseKey = quoteKey({ inputMint, outputMint, amount, slippageBps }); // typed object
  const key = buildTx ? `${baseKey}|build:${userPublicKey}` : baseKey;       // extend string key

  const cached = quoteCache.get(key);
  if (cached) { sendCacheHeaders(res,true); return res.json(cached); }

  const qs = new URLSearchParams({ inputMint, outputMint, amount, slippageBps });
  const quoteUrl = `${QUOTE_BASE}/v6/quote?${qs.toString()}`;
  const quoteResp = await fetchJson<any>(quoteUrl);
  if (!quoteResp.ok) { sendCacheHeaders(res,false); return res.status(quoteResp.status).json({ ok:false, error:quoteResp.error }); }

  let payload: any = quoteResp.data;

  if (buildTx) {
    const swapBody: any = {
      quoteResponse: payload,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicSlippage: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: { priorityLevel: 'high', maxLamports: 1_000_000 },
      },
    };

    const headers: Record<string,string> = { 'content-type': 'application/json' };
    const useV6 = String(process.env.USE_V6_SWAP || '') === 'true';
    const swapUrl = useV6 ? V6_SWAP : LITE_SWAP;
    if (useV6 && JUP_ULTRA_KEY) headers['x-api-key'] = JUP_ULTRA_KEY;

    const swapResp = await fetchJson<any>(swapUrl, { method:'POST', headers, body: JSON.stringify(swapBody) });
    if (!swapResp.ok) { sendCacheHeaders(res,false); return res.status(swapResp.status).json({ ok:false, error: swapResp.error }); }

    const txAny = normalizeSwapTx(swapResp.data);
    if (!txAny) {
      console.error('JUP swap returned 200 but no tx field', { keys: Object.keys(swapResp.data || {}) });
      sendCacheHeaders(res,false);
      return res.status(502).json({ ok:false, error:'no_swap_tx_from_jupiter' });
    }

    payload = { ...payload, swapTransaction: txAny };
    if (!payload.tx) payload.tx = txAny;
  }

  quoteCache.set(key, payload);
  sendCacheHeaders(res,false);
  res.json(payload);
});

app.use((err:any,_req:Request,res:Response,_next:NextFunction) => {
  console.error('Unhandled error', err);
  res.status(500).json({ ok:false, error:'internal_error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Cerberus API listening on :${PORT}`);
    console.log(allowAll ? 'CORS: allowing all origins' : `CORS allow-list: ${ORIGINS.join(', ')}`);
  });
}
