import Redis from "ioredis";
import { env } from "@/src/env";

declare global {
  var __redisClient: Redis | undefined;
}

export const redis =
  global.__redisClient ?? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });

if (process.env.NODE_ENV !== "production") {
  global.__redisClient = redis;
}
