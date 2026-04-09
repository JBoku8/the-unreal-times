# RSS LLM Reader (Fullstack Skeleton)

Modern TypeScript fullstack starter for an RSS feed reader where users can chat with individual articles.

## Stack

- Frontend: Next.js App Router + Tailwind + shadcn-style UI components + Vercel AI SDK `useChat`
- Backend: Next.js Route Handlers + Vercel AI SDK Core + Zod
- Database: PostgreSQL 16 + pgvector via Drizzle ORM
- Cache: Redis 7
- LLM: Provider-resolver defaulting to OpenAI GPT-4o

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

2) Start all services

```bash
docker compose up --build
```

3) Apply DB migrations (in another terminal)

```bash
docker compose exec app pnpm db:migrate
```

If you are not using Docker Compose, run:

```bash
pnpm db:migrate
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

Header:

- `x-admin-key: <ADMIN_KEY>`

Example:

```bash
curl -X POST http://localhost:3000/api/admin/fetch-feeds \
  -H "x-admin-key: change-me"
```

### Article chat (streaming)

`POST /api/chat/:articleId`

`GET /api/chat/:articleId/history?browserId=<id>`

`POST /api/chat/:articleId/conversations`

Body shape:

```json
{
  "browserId": "browser-scoped-id",
  "conversationId": "optional-conversation-id",
  "messages": [
    {
      "role": "user",
      "content": "Summarize this article."
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

- `humorous`: an LLM-rewritten variant of the raw article (the stored/readable article row)
- `embedding`: a background job type that computes vector embedding for the `humorous` row

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
- Stale `processing` jobs are eligible for reclaim after timeout.
- Manual retry for MVP is done by resetting `status = "pending"` and `attempts = 0` in DB.

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm db:clear-feeds -- --yes
pnpm compose:up
pnpm compose:down
```

With Docker Compose:

```bash
docker compose exec app pnpm db:clear-feeds -- --yes
```

## Environment Variables

See `.env.example`:

- `DATABASE_URL`
- `REDIS_URL`
- `AI_PROVIDER` (`openai` by default)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (`gpt-4o` by default)
- `ADMIN_KEY`
- `RSS_FEED_URLS` (comma-separated)
