import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Express } from "express";
import request from "supertest";

// Mock Redis with an in-memory Map
vi.mock("../src/lib/redis.js", () => {
  const mem = new Map<string, string>();
  return {
    getRedis: () => ({
      async get(k: string) { return mem.has(k) ? mem.get(k)! : null; },
      async set(k: string, v: string) { mem.set(k, v); },
    })
  };
});

// Mock fetch for quote, swap, and shield
const quoteBody = JSON.stringify({ ok: true, data: { routePlan: [], contextSlot: 0 } });
vi.stubGlobal("fetch", async (url: any) => {
  const u = String(url);
  if (u.includes("/v6/quote")) {
    return new Response(quoteBody, { status: 200, headers: { "content-type": "application/json" } });
  }
  if (u.includes("/v6/swap")) {
    return new Response(JSON.stringify({ ok: true, swapTx: "deadbeef" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (u.includes("/shield")) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response("not found", { status: 404 });
});

let app: Express;
beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  const mod = await import("../src/server.js");
  app = mod.app as Express;
});

const IN  = "So11111111111111111111111111111111111111112";
const OUT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("order route", () => {
  it("returns quote and caches it", async () => {
    const q = { inputMint: IN, outputMint: OUT, amount: "1000000", slippageBps: "50" };

    const r1 = await request(app).get("/order").query(q);
    expect(r1.status).toBe(200);
    expect(r1.headers["x-cache"]).toBe("MISS");

    const r2 = await request(app).get("/order").query(q);
    expect(r2.status).toBe(200);
    expect(r2.headers["x-cache"]).toBe("HIT");
  });

  it("exposes metrics", async () => {
    const m = await request(app).get("/metrics");
    expect(m.status).toBe(200);
    expect(m.body.order.requests).toBeGreaterThanOrEqual(2);
    expect(m.body.order.cache.hit).toBeGreaterThanOrEqual(1);
  });
});
