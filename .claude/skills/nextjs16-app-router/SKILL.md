---
name: nextjs16-app-router
description: Use when adding pages, route handlers, or layouts in this Next.js 16 App Router codebase. Covers async params/searchParams, server component data fetching, notFound(), and route handler conventions specific to this version.
---

# Next.js 16 App Router Conventions

## Async Params (Breaking Change in Next.js 15+)

In Next.js 15+, `params` and `searchParams` are **Promises**, not plain objects.

```ts
// Page component
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>
}) {
  const { articleId } = await params  // must await before destructuring
  ...
}

// Search params
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  ...
}

// Route handler
export async function POST(
  req: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await context.params
  ...
}
```

**Never** destructure params in the function signature — it will fail at runtime.

## Server Component Data Fetching

Pages call `db` directly — no separate API route needed for read operations:

```ts
// In a page component
const article = await db.query.articles.findFirst({
  where: eq(articles.id, articleId),
  columns: { id: true, title: true },
})

if (!article) notFound()  // renders the nearest not-found.tsx
```

Wrap DB calls in `try/catch` with an empty fallback when the page should still render without data (e.g. home feed, search).

## Route Handler Conventions

```ts
// app/api/.../route.ts
export const maxDuration = 30  // required for streaming responses on Vercel

export async function POST(req: Request, context: { params: Promise<{...}> }) {
  // always await context.params
}
```

Auth for admin routes uses `x-admin-key` header — see `rss-ingestion-pipeline` skill.

## Error Boundaries (Next.js 16)

Use App Router file conventions for runtime error fallback UIs:

- `app/error.tsx` for route segment errors
- `app/global-error.tsx` for root layout-level errors

Both files must be Client Components and should use `unstable_retry`:

```tsx
"use client"

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <button onClick={() => unstable_retry()}>Try again</button>
}
```

`global-error.tsx` must render full document structure (`<html>` + `<body>`).

## Not Found

```ts
import { notFound } from "next/navigation"

if (!article) notFound()  // call like a function, no return needed
```

## Client Request UX Conventions

In this codebase:

- Prefer **server component reads** for page content (`app/search/page.tsx`, `app/article/[articleId]/page.tsx`)
- Use **TanStack Query `useMutation`** for client-triggered admin API writes (e.g. scraper actions)
- Use **`useTransition`** for navigation-submit UIs in client forms (e.g. `app/search/search-form.tsx`)

This avoids ad-hoc loading/error state machines in components.

## File Layout

```
app/
  page.tsx                          → /
  layout.tsx                        → root layout
  article/[articleId]/page.tsx      → /article/:id
  search/page.tsx                   → /search
  admin/scraper/page.tsx            → /admin/scraper
  api/
    chat/[articleId]/route.ts       → POST /api/chat/:id
    admin/fetch-feeds/route.ts      → POST /api/admin/fetch-feeds
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `{ params: { articleId: string } }` | `{ params: Promise<{ articleId: string }> }` |
| `const { id } = params` before await | `const { id } = await params` |
| Fetching data in a client component via fetch | Use async server component with direct DB call |
| `return notFound()` | Just `notFound()` — it throws internally |
| Creating custom error pages outside App Router conventions | Use `app/error.tsx` and `app/global-error.tsx` with `unstable_retry` |
