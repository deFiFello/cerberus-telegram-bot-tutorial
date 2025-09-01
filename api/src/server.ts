/**
 * Cerberus API proxy (Node 18+/20+/22+ with global fetch)
 * Jupiter v6:
 *   - Quote: GET  https://quote-api.jup.ag/v6/quote
 *   - Swap : POST https://quote-api.jup.ag/v6/swap
 * NOTE: Never send x-api-key to quote-api endpoints.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";

// local libs (NodeNext needs .js extensions on relative imports)
import { getRedis } from "./lib/redis.js";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import { safetyGate } from "./lib/safety.js";
import { met } from "./lib/metrics.js";


// ---------- config ----------
const PORT = Number(process.env.PORT || 4000);
const QUOTE_BASE = (process.env.QUOTE_BASE || "https://quote-api.jup.ag").replace(/\/$/, "");
const LITE_BASE  = (process.env.LITE_BASE  || "https://lite-api.jup.ag").replace(/\/$/, "");
const ULTRA_BASE = (process.env.ULTRA_BASE || "https://api.jup.ag/ultra").replace(/\/$/, "");
const ULTRA_KEY  = process.env.JUP_ULTRA_KEY || "";

// ---------- app ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// pino-http typing under NodeNext: cast once
const pinoMw = pinoHttp as unknown as (opts?: any) => any;
app.use(pinoMw({ logger, genReqId: () => crypto.randomUUID() }));

// Redis optional
const redis = getRedis(process.env.REDIS_URL);
logger.info({ redis: !!redis }, "redis_init");

// Basic rate limit for hot endpoints
const perIpLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ code: "RATE_LIMIT", msg: "Too many requests" })
});

// ---------- helpers ----------
function contentTypeIsJSON(h: Headers | HeadersInit): boolean {
  const get = (h as Headers).get?.bind(h as Headers);
  const val = get ? get("content-type") : (h as Record<string, string>)["content-type"];
  return (val || "").toLowerCase().includes("application/json");
}

async function forwardJSON(res: express.Response, r: Response) {
  res.status(r.status);
  r.headers.forEach((v, k) => {
    if (["cache-control", "etag", "content-type"].includes(k.toLowerCase())) res.setHeader(k, v);
  });
  if (contentTypeIsJSON(r.headers)) {
    const j = await r.json().catch(() => null);
    res.json(j ?? { ok: false, status: r.status });
  } else {
    const t = await r.text().catch(() => "");
    res.json({ ok: r.ok, status: r.status, body: t });
  }
}

function badRequest(res: express.Response, msg: string) {
  res.status(400).json({ code: "BAD_REQUEST", msg });
}

function requireParamStr(res: express.Response, obj: any, key: string): string | undefined {
  const v = obj?.[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  badRequest(res, `Param '${key}' required`);
  return undefined;
}

// ---------- Jupiter v6 clients ----------
async function jupQuote(params: URLSearchParams) {
  const url = `${QUOTE_BASE}/v6/quote?${params.toString()}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
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
    prioritizationFeeLamports: 0
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Swap build failed: ${r.status} ${t}`);
  }
  return r.json();
}

// ---------- routes ----------
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    quote: QUOTE_BASE,
    lite: LITE_BASE,
    ultra: ULTRA_BASE,
    ultraKey: Boolean(ULTRA_KEY),
    redis: Boolean(redis)
  });
});

// Metrics snapshot
app.get("/metrics", (_req, res) => {
  res.json(met.snapshot());
});

/**
 * /order
 * Required: inputMint, outputMint, amount, slippageBps
 * Optional: buildTx=true, userPublicKey (required if buildTx=true)
 */
app.get("/order", perIpLimiter, async (req, res) => {
  try {
    const inputMint   = requireParamStr(res, req.query, "inputMint");    if (!inputMint) return;
    const outputMint  = requireParamStr(res, req.query, "outputMint");   if (!outputMint) return;
    const amount      = requireParamStr(res, req.query, "amount");       if (!amount) return;
    const slippageStr = requireParamStr(res, req.query, "slippageBps");  if (!slippageStr) return;

    const slippageBps = Number(slippageStr);
    if (!Number.isFinite(slippageBps) || slippageBps < 0) return badRequest(res, "slippageBps must be non-negative");

    const buildTx = String(req.query.buildTx ?? "").toLowerCase() === "true";
    const userPublicKey = String(req.query.userPublicKey ?? "").trim();

    req.log?.info?.({ route: "order", buildTx, inputMint, outputMint, amount, slippageBps, hasUserKey: !!userPublicKey }, "order_request");

    // metrics start
    met.orderRequest();
    const t0 = Date.now();

    // safety gate
    const gate = await safetyGate({ inputMint, outputMint, liteBase: LITE_BASE, redis });
    if (!gate.ok) {
      met.safetyBlock();
      req.log?.warn?.({ route: "order", code: gate.code }, "safety_gate_block");
      return res.status(400).json({ code: gate.code, msg: gate.msg });
    }

    // buildTx path
    if (buildTx) {
      if (!userPublicKey) return badRequest(res, "Param 'userPublicKey' required when buildTx=true");
      const qs = new URLSearchParams({ inputMint, outputMint, amount, slippageBps: String(slippageBps) });
      const quoteResponse = await jupQuote(qs);
      const swapResponse = await jupBuildSwap(quoteResponse, userPublicKey, slippageBps);
      req.log?.info?.({ route: "order", buildTx: true }, "order_response");
      // count as a MISS for latency accounting since we hit upstream
      met.cacheMiss();
      met.observe(Date.now() - t0);
      return res.json(swapResponse);
    }

    // quote with 8s cache
    const cacheKey = `ord:${inputMint}:${outputMint}:${amount}:${slippageBps}`;
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader("x-cache", "HIT");
        met.cacheHit();
        met.observe(Date.now() - t0);
        req.log?.info?.({ route: "order", cached: true }, "order_response");
        return res.json(JSON.parse(cached));
      }
    }

    const qs = new URLSearchParams({ inputMint, outputMint, amount, slippageBps: String(slippageBps) });
    const quoteResponse = await jupQuote(qs);

    if (redis) await redis.set(cacheKey, JSON.stringify(quoteResponse), "EX", 8);
    res.setHeader("x-cache", "MISS");
    met.cacheMiss();
    met.observe(Date.now() - t0);
    req.log?.info?.({ route: "order", cached: false }, "order_response");
    return res.json(quoteResponse);
  } catch (err: any) {
    const msg = err?.message || String(err);
    met.upstreamFail();
    req.log?.error?.({ err: msg }, "order_unhandled");
    return res.status(502).json({ code: "UPSTREAM_ERROR", msg });
  }
});

/** Optional passthroughs for docs */
app.get("/tokens", perIpLimiter, async (_req, res) => {
  try {
    const r = await fetch(`${LITE_BASE}/tokens`);
    return forwardJSON(res, r);
  } catch (e: any) {
    return res.status(502).json({ code: "UPSTREAM_ERROR", msg: e?.message || "Upstream error" });
  }
});

app.get("/shield", perIpLimiter, async (req, res) => {
  const mints = requireParamStr(res, req.query, "mints"); if (!mints) return;
  try {
    const r = await fetch(`${LITE_BASE}/shield?${new URLSearchParams({ mints })}`);
    return forwardJSON(res, r);
  } catch (e: any) {
    return res.status(502).json({ code: "UPSTREAM_ERROR", msg: e?.message || "Upstream error" });
  }
});

// ---------- landing ----------
app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Cerberus API</title>
  <style>body{font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;margin:40px;color:#0f172a;background:#f8fafc}.card{max-width:860px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 6px 18px rgba(15,23,42,.06);padding:28px}h1{margin:0 0 12px;font-size:28px}code{background:#0f172a;color:#e2e8f0;padding:2px 6px;border-radius:6px}a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.foot{margin-top:16px;color:#475569;font-size:13px}</style>
  <div class="card">
  <h1>🐶 Cerberus API</h1>
  <p>Non-custodial swaps via <b>Jupiter v6</b>. Educational use only.</p>
  <ul class="mono">
    <li><a href="/health">GET /health</a></li>
    <li><a href="/order?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=50">GET /order (quote)</a></li>
    <li><code>/order?...&buildTx=true&userPublicKey=&lt;BASE58&gt;</code> (build swap)</li>
    <li><a href="/tokens">GET /tokens</a></li>
    <li><a href="/shield?mints=So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">GET /shield</a></li>
  </ul>
  </div>`);
});

// ---------- fallback ----------
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ---------- start ----------
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, "api_up");
    console.log(`Cerberus API listening on :${PORT}`);
    console.log(`Quote base: ${QUOTE_BASE}`);
    console.log(`Lite base : ${LITE_BASE}`);
    console.log(`Ultra base: ${ULTRA_BASE}`);
    console.log(`Ultra key present: ${Boolean(ULTRA_KEY)}`);
  });
}

// For tests
export { app };
