export type CacheEntry<T> = { value: T; expiresAt: number };

export class TTLCache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private max = 500, private ttlMs = 15_000) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return;
    if (Date.now() > e.expiresAt) {
      this.store.delete(key);
      return;
    }
    return e.value;
  }

  set(key: string, value: T) {
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

export function quoteKey(q: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: string;
}) {
  return `${q.inputMint}|${q.outputMint}|${q.amount}|${q.slippageBps}`;
}
