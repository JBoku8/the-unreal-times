---
name: drizzle-postgres-patterns
description: Use when writing database queries, schema changes, or migrations in this codebase. Covers Drizzle ORM with the postgres-js driver, onConflictDoUpdate upserts, relational queries, aggregate selects, and the migration workflow.
---

# Drizzle + Postgres Patterns

## Stack

- `drizzle-orm` with `postgres-js` driver (`postgres` package, NOT `pg`)
- Schema: `src/db/schema.ts` — single source of truth for all tables
- Client: `src/db/client.ts` — import `db` from here everywhere
- Migrations output: `src/db/migrations/`

## Client Setup

```ts
// src/db/client.ts
const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, { schema })
```

`prepare: false` is required — prepared statements don't work with PgBouncer/pooled connections.

## Schema Conventions

```ts
// UUIDs with defaultRandom(), timestamps with withTimezone
id: uuid("id").defaultRandom().primaryKey()
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

// FK with cascade delete
feedId: uuid("feed_id").notNull().references(() => feeds.id, { onDelete: "cascade" })

// Table-level indexes in second arg
(table) => [index("articles_feed_id_idx").on(table.feedId)]

// pgvector column
embedding: vector("embedding", { dimensions: 1536 })
```

Tables: `feeds` → `raw_articles` → `transformation_jobs`; `raw_articles` → `articles` → `conversations` → `messages` (all cascade-delete).

## Query Patterns

**Relational query (findFirst / findMany):**
```ts
import { eq, desc, ilike, or } from "drizzle-orm"

const article = await db.query.articles.findFirst({
  where: eq(articles.id, articleId),
  columns: { id: true, title: true, content: true },
})

const rows = await db.query.articles.findMany({
  where: or(ilike(articles.title, pattern), ilike(articles.content, pattern)),
  orderBy: desc(articles.publishedAt),
  limit: 40,
})
```

**Aggregate select:**
```ts
const [row] = await db.select({ total: count() }).from(articles)
const n = Number(row?.total ?? 0)

// Group by (note: rawArticles has feedId, articles does not)
const countRows = await db
  .select({ feedId: rawArticles.feedId, n: count() })
  .from(rawArticles)
  .groupBy(rawArticles.feedId)
```

**Upsert (idempotent insert):**
```ts
const [feed] = await db
  .insert(feeds)
  .values({ url, title, lastFetchedAt: new Date() })
  .onConflictDoUpdate({
    target: feeds.url,          // unique column(s)
    set: { title, lastFetchedAt: new Date() },
  })
  .returning({ id: feeds.id })  // always chain .returning() to get the row
```

## Migration Workflow

```bash
pnpm db:generate   # generates SQL from schema diff
pnpm db:migrate    # applies pending migrations
pnpm db:studio     # visual inspector
```

After any schema change: generate → review generated SQL → migrate.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Importing from `drizzle-orm/pg-core` directly in query files | Only import operators (`eq`, `desc`, etc.) from `drizzle-orm`; table helpers from `drizzle-orm/pg-core` only in schema |
| Forgetting `.returning()` on insert | Without it, Drizzle returns nothing — result is `[]` |
| Using `pg` driver | This codebase uses `postgres-js` (`import postgres from "postgres"`) |
| Running migrations without `dotenv/config` | `drizzle.config.ts` imports `dotenv/config` at the top — standalone scripts need to do the same |
