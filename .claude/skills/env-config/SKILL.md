---
name: env-config
description: Use when reading environment variables, adding new config, or touching process.env anywhere in this codebase. All env vars must go through src/env.ts — never read process.env directly (except process.env.NODE_ENV which is framework-managed).
---

# Environment Config

All environment variables are centralised in `src/env.ts`. Never scatter `process.env.X` calls across files — always add to `src/env.ts` and import `env` from there.

## The module

```ts
// src/env.ts
function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = { ... } as const;
```

- `required()` — throws at startup if the var is missing. Use for anything the app cannot run without.
- `optional()` — returns the fallback silently. Use for tunables that have sensible defaults.

The object is evaluated once at module initialisation, so missing required vars surface immediately on startup rather than mid-request.

## Current variables

| Key | Helper | Default | Purpose |
|-----|--------|---------|---------|
| `DATABASE_URL` | required | — | Postgres connection string |
| `REDIS_URL` | required | — | Redis connection string |
| `OPENAI_API_KEY` | required | — | OpenAI API key |
| `AI_PROVIDER` | optional | `"openai"` | AI provider name (lowercased) |
| `OPENAI_MODEL` | optional | `"gpt-5.4-nano"` | Model ID to use |
| `ADMIN_KEY` | required | — | Bearer token for admin endpoints |
| `RSS_FEED_URLS` | optional | `""` | Comma-separated RSS feed URLs |

`process.env.NODE_ENV` is intentionally **not** in `src/env.ts` — it is framework-managed by Next.js and Node.js.

## Adding a new variable

1. Add it to `src/env.ts`:

```ts
export const env = {
  // existing vars...
  MY_NEW_VAR: required("MY_NEW_VAR"),          // required
  MY_OPTIONAL_VAR: optional("MY_OPTIONAL_VAR", "default"), // optional
} as const;
```

2. Add it to `.env.example` with a placeholder value and comment.
3. Import and use `env.MY_NEW_VAR` — never `process.env.MY_NEW_VAR`.

## Consuming the config

```ts
import { env } from "@/src/env";

// ✓ correct
const client = postgres(env.DATABASE_URL);

// ✗ wrong — don't do this
const client = postgres(process.env.DATABASE_URL!);
```

## CLI scripts (outside Next.js)

Scripts that run via `tsx` (e.g. `src/db/clear-feeds.ts`) must load `.env` themselves before `src/env.ts` evaluates:

```ts
import "dotenv/config";   // must be first import
import { env } from "@/src/env";
```

`dotenv/config` is a side-effect import that populates `process.env` synchronously before other modules resolve — so the order of imports matters here.
