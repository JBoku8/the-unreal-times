import { env } from "@/src/env";
import { redis } from "./client";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

export async function enforceChatRateLimit(browserId: string): Promise<RateLimitResult> {
  const key = `rate:chat:${browserId}`;
  const windowSeconds = env.CHAT_RATE_LIMIT_WINDOW_SECONDS;
  const maxRequests = env.CHAT_RATE_LIMIT_MAX_REQUESTS;

  const requests = await redis.incr(key);
  if (requests === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);
  const resetSeconds = ttl > 0 ? ttl : windowSeconds;
  const remaining = Math.max(0, maxRequests - requests);
  const allowed = requests <= maxRequests;

  return { allowed, remaining, resetSeconds };
}
