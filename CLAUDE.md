# This is NOT the Next.js you know

Breaking changes — APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Commands

```bash
pnpm build           # production build
pnpm lint            # ESLint
pnpm db:generate     # generate Drizzle migrations from schema
pnpm db:migrate      # apply pending migrations
pnpm db:studio       # open Drizzle Studio
pnpm db:clear-feeds  # wipe feeds + raw_articles (requires --yes flag)
pnpm compose:up          # start dev environment (with hot reload)
pnpm compose:up:prod     # start prod environment
pnpm compose:down        # stop environment
```

Run migrations inside Docker: `docker compose exec app pnpm db:migrate`

## Architecture

RSS reader where users can chat with individual articles using an LLM.

**Data flow:**
1. `POST /api/admin/fetch-feeds` — upserts `feeds` + `raw_articles`, creates `transformation_jobs`
2. `POST /api/admin/process-articles` — batch-processes pending jobs; `transform-article` reruns a single one
3. Home/search pages query `articles` via Drizzle; article page adds a chat sidebar
4. `POST /api/chat/[articleId]` — streams LLM response via Vercel AI SDK → `toUIMessageStreamResponse()`

**DB relationships:** `feeds` → `raw_articles` → `transformation_jobs`; `raw_articles` → `articles` → `conversations` → `messages` (all cascade-delete). Note: `conversations` has no `messages` JSONB column — all chat messages live in the `messages` table.

**Non-obvious paths:**

| Path | Purpose |
|------|---------|
| `src/db/schema.ts` | Single source of truth for all tables |
| `src/env.ts` | All env vars — never read `process.env` directly (see `env-config` skill) |
| `src/ai/provider.ts` | `resolveChatModel()` — provider resolved from `AI_PROVIDER` env var |
| `src/utils/cn.ts` | `cn()` utility (clsx + tailwind-merge) |
| `src/utils/url.ts` | `hostnameFromUrl()` + `isValidUUID()` — used in pages and API routes |
| `src/features/chat/utils.ts` | `messageText()` — extracts plain text from a `UIMessage` |
| `src/features/admin/api-client.ts` | `callAdminApi()` + `ApiError` — use for all admin fetch calls |
| `components/ui/` | Primitive UI components (shadcn-style, hand-owned) |

## Environment Variables

Copy `.env.example` to `.env`. Key vars:
- `DATABASE_URL` / `REDIS_URL` — set automatically by Docker Compose
- `AI_PROVIDER` — only `openai` supported currently
- `RSS_FEED_URLS` — comma-separated list of RSS feed URLs to ingest
- `ADMIN_KEY` — bearer token for admin endpoints
