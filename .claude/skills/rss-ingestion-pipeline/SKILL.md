---
name: rss-ingestion-pipeline
description: Use when modifying feed fetching, adding new RSS sources, changing ingestion logic, or working on the admin fetch-feeds endpoint. Covers rss-parser usage, thumbnail extraction, admin key auth, and idempotent upsert patterns.
---

# RSS Ingestion Pipeline

## Architecture

```
RSS_FEED_URLS (env) → POST /api/admin/fetch-feeds → fetchFeeds() → upsert feeds + raw_articles + transformation_jobs
                                                                              ↓
                       POST /api/admin/transform-article ──────────── run job → write articles
```

**Files:**
- `src/features/feeds/services/fetch-feeds.ts` — pure RSS parsing, returns `ParsedArticle[]`
- `app/api/admin/fetch-feeds/route.ts` — HTTP handler, auth, DB writes
- `app/api/admin/transform-article/route.ts` — runs one raw_article through the transform pipeline

## Admin Auth Pattern

```ts
import { env } from "@/src/env"

const providedKey = req.headers.get("x-admin-key")
if (providedKey !== env.ADMIN_KEY) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

The key comes from `env.ADMIN_KEY` (see `env-config` skill). Never read `process.env.ADMIN_KEY` directly.

## fetchFeeds Function

```ts
// src/feeds/fetch.ts
export async function fetchFeeds(urls: string[]): Promise<ParsedArticle[]>

type ParsedArticle = {
  feedTitle: string; feedDescription?: string; feedUrl: string
  title: string; content: string; url: string
  thumbnailUrl?: string; publishedAt?: Date
}
```

Uses `rss-parser`. Content prefers `contentSnippet`, falls back to `content`. Articles without `item.link` are skipped.

Thumbnail resolution checks (in priority order): `isoImage`, `image`, `media:thumbnail`, `media:content`, `itunes:image`, `enclosure` (image type only).

## Upsert Order

Always upsert **feed first**, then **raw_article**, then create **transformation_jobs**:

```ts
const [feed] = await db.insert(feeds)
  .values({ url: item.feedUrl, title: item.feedTitle, lastFetchedAt: new Date() })
  .onConflictDoUpdate({ target: feeds.url, set: { title: item.feedTitle, lastFetchedAt: new Date() } })
  .returning({ id: feeds.id })

const [rawArticle] = await db.insert(rawArticles)
  .values({ feedId: feed.id, url: item.url, title: item.title, rawContent: item.content })
  .onConflictDoUpdate({ target: rawArticles.url, set: { title: item.title, rawContent: item.content } })
  .returning({ id: rawArticles.id })

// idempotent — ON CONFLICT DO NOTHING
await db.insert(transformationJobs)
  .values([
    { rawArticleId: rawArticle.id, transformationType: "humorous" },
    { rawArticleId: rawArticle.id, transformationType: "embedding" },
  ])
  .onConflictDoNothing()
```

`rawArticles.url` is the unique conflict target — re-ingesting the same URL updates content without duplicating.

## Feed URL Config

```
RSS_FEED_URLS=https://hnrss.org/frontpage,https://www.theverge.com/rss/index.xml
```

Comma-separated. Parsed in the route handler — each URL is trimmed and empty entries are filtered.

## Triggering Ingestion

```bash
curl -X POST http://localhost:3000/api/admin/fetch-feeds -H "x-admin-key: change-me"
# or via admin UI at /admin/scraper
```

Response shape: `{ status, feedsProcessed, feedRowsUpserted, rawArticleRowsUpserted, transformationJobsCreated }`.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Inserting article before feed | Feed ID is needed as FK — always feed first |
| Not filtering empty URLs | `filter(Boolean)` after split+trim |
| Expecting `item.content` to be full HTML | RSS often only provides `contentSnippet`; full article content requires scraping |
