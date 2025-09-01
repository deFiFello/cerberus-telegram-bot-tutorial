// api/src/lib/safety.ts
export type GateResult = { ok: true } | { ok: false; code: string; msg: string };

function parseList(v?: string) {
  return new Set((v || "").split(",").map(s => s.trim()).filter(Boolean));
}

/**
 * Lightweight token safety gate
 * - BLOCKED_MINTS takes priority
 * - If ALLOWED_MINTS is non-empty, both mints must be present
 * - Optional Shield check via LITE_BASE /shield (cached by Redis if available)
 */
export async function safetyGate(opts: {
  inputMint: string;
  outputMint: string;
  liteBase: string;
  redis?: { get(k: string): Promise<string | null>; set(k: string, v: string, mode: "EX", ttl: number): Promise<any> } | null;
}): Promise<GateResult> {
  const { inputMint, outputMint, liteBase, redis } = opts;
  const blocked = parseList(process.env.BLOCKED_MINTS);
  const allowed = parseList(process.env.ALLOWED_MINTS);

  if (blocked.has(inputMint) || blocked.has(outputMint)) {
    return { ok: false, code: "SHIELD_FLAG", msg: "Mint blocked by policy" };
  }
  if (allowed.size > 0 && (!allowed.has(inputMint) || !allowed.has(outputMint))) {
    return { ok: false, code: "NOT_ALLOWED", msg: "Mint not in allowlist" };
  }

  // Optional: Jupiter Lite Shield signal (best-effort, cached 60s)
  try {
    const cacheKey = `shield:${inputMint}:${outputMint}`;
    const cached = await redis?.get(cacheKey);
    if (cached) {
      const v = JSON.parse(cached);
      return v;
    }

    const url = `${liteBase}/shield?` + new URLSearchParams({ mints: `${inputMint},${outputMint}` });
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (r.ok) {
      const data: any = await r.json().catch(() => ({}));
      // Conservative heuristic: if the response mentions "flag" anywhere, fail fast.
      const flagged = JSON.stringify(data).toLowerCase().includes("flag");
      const result: GateResult = flagged
        ? { ok: false, code: "SHIELD_FLAG", msg: "Token failed safety check" }
        : { ok: true };
      await redis?.set(cacheKey, JSON.stringify(result), "EX", 60);
      return result;
    }
  } catch {
    // Silent fail: do not block if Shield is unreachable
  }

  return { ok: true };
}
