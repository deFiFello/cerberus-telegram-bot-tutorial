// api/src/lib/metrics.ts
type Num = number;

const state = {
  startMs: Date.now(),
  order: {
    requests: 0,
    cache: { hit: 0, miss: 0 },
    safetyBlocks: 0,
    upstreamFail: 0,
    durations: [] as Num[], // last 200
  },
};

function observe(ms: Num) {
  const a = state.order.durations;
  a.push(ms);
  if (a.length > 200) a.shift();
}
function pct(p: number, arr: Num[]) {
  if (!arr.length) return 0;
  const i = Math.floor(((p / 100) * (arr.length - 1)));
  return [...arr].sort((x, y) => x - y)[i];
}

export const met = {
  orderRequest() { state.order.requests++; },
  cacheHit() { state.order.cache.hit++; },
  cacheMiss() { state.order.cache.miss++; },
  safetyBlock() { state.order.safetyBlocks++; },
  upstreamFail() { state.order.upstreamFail++; },
  observe,
  snapshot() {
    const a = state.order.durations;
    const avg = a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
    return {
      uptimeSec: Math.floor((Date.now() - state.startMs) / 1000),
      order: {
        requests: state.order.requests,
        cache: state.order.cache,
        safetyBlocks: state.order.safetyBlocks,
        upstreamFail: state.order.upstreamFail,
        latencyMs: { avg, p50: pct(50, a), p95: pct(95, a) },
      },
    };
  },
};
export type MetricsSnapshot = ReturnType<typeof met.snapshot>;
