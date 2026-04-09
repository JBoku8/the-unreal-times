function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid environment variable: ${key} must be a positive integer`);
  }

  return parsed;
}

export const env = {
  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // Redis
  REDIS_URL: required("REDIS_URL"),

  // AI
  OPENAI_API_KEY: required("OPENAI_API_KEY"),
  AI_PROVIDER: optional("AI_PROVIDER", "openai").toLowerCase(),
  OPENAI_MODEL: optional("OPENAI_MODEL", "gpt-5.4-nano"),

  // Admin
  ADMIN_KEY: required("ADMIN_KEY"),

  // Feeds
  RSS_FEED_URLS: optional("RSS_FEED_URLS", ""),

  // Chat
  CHAT_RATE_LIMIT_WINDOW_SECONDS: optionalInt("CHAT_RATE_LIMIT_WINDOW_SECONDS", 60),
  CHAT_RATE_LIMIT_MAX_REQUESTS: optionalInt("CHAT_RATE_LIMIT_MAX_REQUESTS", 10),
} as const;
