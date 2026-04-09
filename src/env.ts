function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
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
} as const;
