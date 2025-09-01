import * as RedisNS from "ioredis";

// Works for both CJS and ESM builds of ioredis
const RedisCtor: any = (RedisNS as any).default ?? (RedisNS as any);

export type RedisClient = InstanceType<typeof RedisCtor>;
let client: RedisClient | null = null;

export function getRedis(url?: string): RedisClient | null {
  if (!url) return null;
  if (!client) client = new RedisCtor(url, { maxRetriesPerRequest: 3 });
  return client;
}
