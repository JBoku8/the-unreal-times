# Architectural Tradeoffs & Alternatives

This document records the deliberate simplifications made in the MVP and what the alternatives look like. It is meant as a map of the design space — not a backlog, but an honest account of what was chosen and why, and what better options exist.

---

## 1. Feed Ingestion: Manual Trigger vs Automation

**What's built:** All ingestion is triggered manually — an admin presses a button in the dashboard or sends `POST /api/admin/fetch-feeds`. Nothing runs on a schedule.

**Why:** Sufficient for controlled testing; automation adds operational overhead before the pipeline is proven.

**Alternatives:**

| Option | Pros | Cons |
|--------|------|------|
| **`crond` in app container** | Simple, no extra infra | Runs even when nothing changed |
| **Vercel Cron** | Zero-infra if on Vercel | 1 req/min max on free tier |
| **`pg_cron` Postgres extension** | Scheduled SQL inside the DB, no external process | Couples scheduling to the DB |
| **GitHub Actions schedule** | Free, version-controlled | Requires publicly accessible endpoint or outbound-only trigger |
| **BullMQ + Redis** | Full scheduler with backoff, cron expressions, visibility | Redis is already installed but unused — see §9 |

**Smallest viable improvement:** Add a Docker cron service that hits `fetch-feeds` every N minutes. Zero new dependencies.

---

## 2. Transformation Pipeline: Postgres-as-Queue vs Real Job Queue

**What's built:** The `transformation_jobs` table is a hand-rolled job queue. Status transitions (`pending → processing → done/failed`), stale job reclaim (10-minute timeout), and retry limits (3 attempts) are all implemented in application code. Processing is triggered synchronously by an HTTP call — the request blocks until the batch completes.

**Problems:**
- Long batches time out the HTTP request
- No background workers; the pipeline only runs when manually triggered
- Stale job recovery only fires when the next trigger arrives
- Redis is installed but does nothing (see §9)

**Alternative — BullMQ on existing Redis:**
- Workers run continuously in the background, process jobs as they arrive
- Built-in retry strategies, exponential backoff, job prioritisation, concurrency limits
- Bull Board UI for queue observability
- Trade-off: adds conceptual overhead; the Postgres queue is simpler to reason about for low volumes

**Alternative — PostgreSQL `LISTEN/NOTIFY`:**
- A trigger on the `transformation_jobs` table fires a `NOTIFY` when a pending row is inserted
- A long-lived worker process wakes up and processes immediately — no polling
- No new infrastructure
- Trade-off: requires a persistent DB connection and a separate worker process

**Alternative — Vercel AI SDK's streaming + background tasks:**
- If deployed on Vercel, use background functions for long-running work
- Trade-off: vendor lock-in

---

## 3. Embeddings: Stored but Never Queried

**What's built:** Every `humorous` article gets a 1536-dimensional vector computed via `text-embedding-3-small` and stored in `articles.embedding` (pgvector). The embedding job runs successfully and fills the column. Nothing queries it.

**Concrete things that could be built on top:**

**A. Semantic search** — embed the user's search query, then:
```sql
SELECT * FROM articles
ORDER BY embedding <=> $queryEmbedding
LIMIT 20;
```
pgvector operators: `<=>` cosine distance, `<->` L2, `<#>` negative dot product. An **HNSW index** (`CREATE INDEX ON articles USING hnsw (embedding vector_cosine_ops)`) makes this fast at millions of rows.

**B. Related articles** — on the article page, surface the top-5 most similar articles using the current article's own embedding as the query. No user input needed.

**C. Near-duplicate detection** — before creating a transformation job, check if a raw article with cosine similarity > 0.97 already exists. Prevents re-processing RSS re-posts and syndicated articles.

**D. Unsupervised topic clustering** — run K-means or HDBSCAN on all embeddings offline to discover topic groups. No labels required, no LLM cost.

**Current trade-off:** Embeddings cost tokens and latency on every article ingestion, but return no value until queries are added. The investment is in place — the return isn't.

---

## 4. Article Categorisation

**What's built:** Nothing. Articles have no category, tag, or topic label.

**Options:**

**A. RSS feed `<category>` tags** — `rss-parser` already surfaces them; they're currently discarded in `fetch-feeds.ts`. Free, zero latency, requires no AI. Trade-off: inconsistent across feeds, often missing or too granular.

**B. LLM zero-shot classification** — add a `"categorise"` transformation job type. Prompt: `"Assign exactly one of: politics, tech, business, science, culture, sport, other."` Reliable, ~$0.0001 per article with a small model. Trade-off: extra job, extra latency, extra cost.

**C. Embedding-based clustering** — run K-means on stored embeddings (already available) to discover N topic clusters. No extra LLM calls. Trade-off: clusters are unlabelled and unstable as corpus grows; requires a one-time offline labelling pass.

**D. Keyword rules** — a word-list per category (`["senate", "congress", "parliament"]` → politics). Fully deterministic, zero cost. Trade-off: brittle, requires constant maintenance.

**Schema change required:** `category: varchar(64)` on `articles`.

---

## 5. Transformation Quality Evaluation

**What's built:** A transformation job is `done` if the LLM returned valid JSON with `title` and `content` keys. Satire quality is never measured.

**Why it matters:** The current prompt reliably produces output that satisfies the schema. Whether the output is actually funny, coherent, or preserves the original topic is unknown. Without a feedback loop, prompts can't be improved systematically.

**Options:**

**A. LLM-as-judge** — a second LLM call scores the output (1–5) on satirical clarity, readability, and topic preservation. Good for rapid prompt iteration. Trade-off: ~doubles AI cost per article.

**B. Human feedback** — thumbs up/down on the article page, stored in a `feedback` table. Accumulates ground-truth signal at zero AI cost. Trade-off: requires real users and takes time to accumulate.

**C. Structural heuristics** — cheap assertions run synchronously after transformation:
- Output length within bounds (50–2000 words)
- Title differs from the original
- Content doesn't repeat the original verbatim (Jaccard similarity < 0.8)
These catch catastrophic failures only, but cost nothing.

**D. Prompt versioning + A/B** — store `promptVersion` on each article row. Run two prompt variants in parallel on incoming articles. Compare feedback scores or downstream engagement. Trade-off: doubles processing cost during experiments.

---

## 6. Language Detection

**What's built:** None. Articles from any language are ingested and transformed. The transformation prompt is English-only, so non-English source articles produce awkward or incorrect satirical output.

**Options:**

**A. `franc` npm library** — n-gram based language detection, pure JS, offline, ~100ms per article. Accuracy degrades on short text (<50 words). Could gate transformation job creation to English-only articles. Zero API cost.

**B. LLM detection** — add a language field to the transform prompt response: `{ title, content, language }`. Reliable even on short text. Trade-off: changes the prompt schema, costs tokens.

**C. Feed-level annotation** — extend `RSS_FEED_URLS` config format: `https://feed.url|en`. Entire feed is assumed to be the declared language. Zero runtime cost, requires manual maintenance.

**Recommended for MVP extension:** `franc` + skip transformation job creation for non-target languages. Schema change: `detectedLanguage: varchar(10)` on `rawArticles`.

---

## 7. Search: ILIKE vs Full-Text vs Semantic

**What's built:** `WHERE title ILIKE '%query%' OR content ILIKE '%query%'` — a full sequential scan. A leading `%` wildcard makes index use impossible. Degrades linearly with article count.

**Better options:**

**A. PostgreSQL full-text search** (`tsvector` + `GIN` index):
```sql
-- At insert time:
to_tsvector('english', title || ' ' || content)
-- At query time:
WHERE search_vector @@ plainto_tsquery('english', $query)
ORDER BY ts_rank(search_vector, query) DESC
```
Stemming-aware (`running` matches `run`), relevance ranking, indexed. Zero extra infrastructure. This is the right next step.

**B. Semantic vector search** — embed the query string and find nearest-neighbor articles by cosine similarity. Finds conceptually related articles with no keyword overlap. Requires an embedding API call on every search. Latency ~200–400ms.

**C. Hybrid** — full-text for keyword precision + vector search for semantic recall, merged with Reciprocal Rank Fusion (RRF). Best results, highest complexity.

**Current trade-off:** ILIKE is fine at < ~10k articles. It becomes noticeably slow beyond that and has poor relevance (no stemming, no ranking).

---

## 8. Authentication & Access Control

**What's built:** A single `ADMIN_KEY` env var protects all admin endpoints. Public pages have no auth. Conversations are scoped to a browser via a UUID stored in `localStorage`.

**What this means in practice:**
- **No cross-device chat history** — open the same article on your phone and you start fresh
- **No multi-admin** — one shared key, no audit trail of who triggered what
- **No rate limiting** — `/api/chat/[articleId]` can be flooded; each request incurs LLM cost

**User identity alternatives:**
- **NextAuth.js / Auth.js** — OAuth (GitHub, Google) in ~50 lines. Replace `browserId` with real user IDs. Cross-device history works immediately. Trade-off: requires an OAuth app registration, adds session management.
- **Clerk / Auth0** — hosted auth, faster to set up than NextAuth. Trade-off: external dependency, cost at scale.

**Rate limiting** — Redis is already installed. A token-bucket per `browserId` (e.g. 20 chat requests/minute) would cost ~5 lines of `ioredis` code.

**Why not done:** The app is designed as a single-operator tool. Adding user auth multiplies scope significantly and makes the codebase harder to run locally.

---

## 9. Redis: Installed, Unused

**What's built:** `ioredis` client is instantiated at startup (`src/redis/client.ts`), `REDIS_URL` is a required env var. No code path reads from or writes to Redis.

**Concrete things Redis could do right now:**

| Use case | Complexity | Value |
|----------|-----------|-------|
| Rate limiting on `/api/chat` | Low | Prevents runaway LLM cost |
| Cache `getScraperDashboardData()` for 30s | Low | Removes redundant DB queries on each page load |
| BullMQ job queue for transformations | Medium | Background workers, scheduler, observability |
| Pub/sub for job completion events | Medium | Real-time status updates in the dashboard |

**The honest trade-off:** Either use Redis or remove it. An always-on dependency with a required env var that does nothing is operational overhead with no benefit. For a local-only deployment this is fine; for production it wastes memory and startup time.

---

## 10. RSS Polling vs WebSub / Push

**What's built:** On-demand polling — every `fetch-feeds` call re-fetches all feed URLs regardless of whether they have changed. Articles already in the DB are re-upserted (idempotent but wasteful).

**Alternative — WebSub (formerly PubSubHubbub):**
Many publishers advertise `<atom:link rel="hub" href="..."/>` in their feeds. Subscribe once; the hub delivers a HTTP POST to your endpoint when the feed updates. Near-instant delivery, zero polling.
- Trade-off: requires a publicly accessible webhook endpoint; roughly half of major publishers support it.

**Smaller, immediate improvement — HTTP conditional requests:**
```
GET https://feed.url
If-Modified-Since: <last fetch timestamp>
```
If the server responds `304 Not Modified`, skip parsing entirely. Saves bandwidth and parse CPU for unchanged feeds. Supported by most RSS servers. Requires storing `lastFetchedAt` per feed (already in the schema).

---

## 11. LLM Provider Abstraction

**What's built:** `resolveChatModel()` in `src/ai/provider.ts` has a `switch` on `AI_PROVIDER` with only `"openai"` implemented. The abstraction exists but is a dead branch for anything else.

**What extending it enables:**

| Provider | Notes |
|----------|-------|
| `"anthropic"` | Claude via `@ai-sdk/anthropic`; better at following complex instructions |
| `"ollama"` | Local models (Llama 3, Mistral) via `ollama-ai-provider`; zero API cost, runs in Docker |
| Per-task routing | Cheap model for categorisation, expensive model for satirical rewriting |

**Current trade-off:** The `switch` throws on any unrecognised provider, making the abstraction actively misleading. The right choice is either: implement one more provider to prove the abstraction, or remove the switch and hardcode OpenAI.
