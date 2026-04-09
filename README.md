# The Unreal Times — Satirical RSS Reader

TypeScript fullstack app: an RSS feed reader where articles are rewritten satirically by an LLM, and users can chat with each article in context.

## Stack

- Frontend: Next.js App Router + Tailwind + shadcn-style UI components + Vercel AI SDK `useChat`
- Backend: Next.js Route Handlers + Vercel AI SDK Core + Zod
- Database: PostgreSQL 16 + pgvector via Drizzle ORM
- Cache: Redis 7
- LLM: Provider-resolver defaulting to OpenAI (`gpt-5.4-nano`)

## Request Handling Pattern

- Client-side write actions (admin triggers) use `@tanstack/react-query` mutations for built-in
  `isPending` / `isError` / `isSuccess` state handling.
- Search navigation form uses `useTransition` for Next.js-native pending UI.
- Article chat uses `useChat` status/error from AI SDK (streaming-friendly).

## Error Boundaries (App Router)

This app implements Next.js App Router error boundaries:

- `app/error.tsx` — segment-level runtime errors
- `app/global-error.tsx` — root-level rendering errors

Both are client components and use `unstable_retry()` to attempt recovery.

## Quickstart

1) Copy env file

```bash
cp .env.example .env
```

2) Start all services (dev, with hot reload)

```bash
pnpm compose:up
```

3) Apply DB migrations (in another terminal)

```bash
docker compose exec app pnpm db:migrate
```

4) Open app

- [http://localhost:3000](http://localhost:3000)

## Development without Docker (optional)

If your local Postgres + Redis are already running:

```bash
pnpm install
pnpm dev
```

## API Endpoints

### Admin feed ingestion

`POST /api/admin/fetch-feeds`

Fetches all RSS feeds from `RSS_FEED_URLS`, upserts feeds and raw articles, creates transformation jobs.

Header: `x-admin-key: <ADMIN_KEY>`

```bash
curl -X POST http://localhost:3000/api/admin/fetch-feeds \
  -H "x-admin-key: change-me"
```

### Admin batch processing

`POST /api/admin/process-articles`

Processes a batch of pending transformation jobs (default 10, max 50).

```bash
curl -X POST http://localhost:3000/api/admin/process-articles \
  -H "x-admin-key: change-me" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 20}'
```

### Admin single-article transform

`POST /api/admin/transform-article`

Resets and re-runs all transformation jobs for one raw article.

```bash
curl -X POST http://localhost:3000/api/admin/transform-article \
  -H "x-admin-key: change-me" \
  -H "Content-Type: application/json" \
  -d '{"rawArticleId": "<uuid>"}'
```

### Admin transform preview (dry-run)

`POST /api/admin/transform-preview`

Runs the humorous transform for a raw article but does not persist the result.

```bash
curl -X POST http://localhost:3000/api/admin/transform-preview \
  -H "x-admin-key: change-me" \
  -H "Content-Type: application/json" \
  -d '{"rawArticleId": "<uuid>"}'
```

### Admin untransformed article list

`POST /api/admin/raw-articles`

Returns up to 50 raw articles that have no transformed `articles` row yet, optionally filtered by feed.

```bash
curl -X POST http://localhost:3000/api/admin/raw-articles \
  -H "x-admin-key: change-me" \
  -H "Content-Type: application/json" \
  -d '{"feedId": "<optional-uuid>"}'
```

### Article chat (streaming)

`POST /api/chat/:articleId`

`GET /api/chat/:articleId/history?browserId=<id>`

`POST /api/chat/:articleId/conversations`

Body shape for `POST /api/chat/:articleId`:

```json
{
  "browserId": "browser-scoped-id",
  "conversationId": "optional-conversation-id",
  "messages": [
    {
      "role": "user",
      "parts": [{ "type": "text", "text": "Summarize this article." }]
    }
  ]
}
```

Notes:

- Chat history is persisted per article and per browser identity.
- Browser identity is generated client-side and reused from local storage.
- "New conversation" creates a new thread for the same article/browser and marks it active.
- Structured prompts are supported in UI (summary, entities, and transformed-vs-original comparison).

## Transformation Pipeline Reference

The app stores one canonical raw article and then produces transformed outputs asynchronously.

### `transformationType` values

- `humorous`: an LLM-rewritten satirical variant of the raw article (the stored/readable article row)
- `embedding`: a background job type that computes a vector embedding for the `humorous` row

Notes:

- In `articles`, `transformationType` identifies which transformed variant a row represents.
- In `transformation_jobs`, `transformationType` identifies which background processor should run.

### `transformation_jobs.status` lifecycle

- `pending`: queued and waiting to be claimed by the processor
- `processing`: claimed by a worker and currently running (or stale and recoverable)
- `done`: successfully completed
- `failed`: processing attempt failed; last error is stored in `errorMessage`

Retry behavior:

- Jobs are retried up to 3 attempts.
- Stale `processing` jobs (stuck for more than 10 minutes) are eligible for reclaim.
- Manual retry via the admin UI resets `status = "pending"` and `attempts = 0`.

## Useful Commands

```bash
pnpm lint
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm db:clear-feeds -- --yes
pnpm compose:up          # dev (hot reload)
pnpm compose:up:prod     # production
pnpm compose:down
```

With Docker Compose:

```bash
docker compose exec app pnpm db:migrate
docker compose exec app pnpm db:clear-feeds -- --yes
```

## Environment Variables

See `.env.example`:

- `DATABASE_URL`
- `REDIS_URL`
- `AI_PROVIDER` (`openai` by default)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (`gpt-5.4-nano` by default)
- `ADMIN_KEY`
- `RSS_FEED_URLS` (comma-separated)

## Architecture & Tradeoffs

See [TRADEOFFS.md](./TRADEOFFS.md) for a detailed account of the architectural decisions made in this MVP, what was deliberately simplified, and what the alternatives look like (cron jobs, job queues, semantic search, categorisation, quality evaluation, and more).
