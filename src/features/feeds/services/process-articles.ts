import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { articles, rawArticles, transformationJobs } from "@/src/db/schema";
import type { TransformationJobRow } from "@/src/db/types";
import { generateHumorousTransform } from "@/src/ai/transform";
import { generateEmbedding } from "@/src/ai/embed";

// Summary of results from one processing pass.
export type ProcessResult = {
  processed: number;
  succeeded: number;
  failed: number;
  remainingPending: number;
};

// Picks a limited set of eligible jobs, claims them, and runs them.
export async function processJobBatch(batchSize = 10): Promise<ProcessResult> {
  // Jobs that have been processing for longer than 10 minutes are considered stale and can be reclaimed.
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

  // Select jobs that can safely be claimed now.
  const claimable = await db
    .select({ id: transformationJobs.id })
    .from(transformationJobs)
    .where(
      and(
        or(
          eq(transformationJobs.status, "pending"),
          and(
            eq(transformationJobs.status, "processing"),
            lt(transformationJobs.startedAt, staleThreshold),
          ),
        ),
        lt(transformationJobs.attempts, 3),
      ),
    )
    .orderBy(asc(transformationJobs.createdAt))
    .limit(batchSize);

  if (claimable.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, remainingPending: 0 };
  }

  const ids = claimable.map((r) => r.id);

  // Mark selected jobs as processing in one atomic update.
  const claimed = await db
    .update(transformationJobs)
    .set({
      status: "processing",
      startedAt: new Date(),
      attempts: sql`${transformationJobs.attempts} + 1`,
    })
    .where(inArray(transformationJobs.id, ids))
    .returning();

  const { succeeded, failed } = await processClaimedJobs(claimed);

  // Count jobs that are still eligible to be processed.
  const [remaining] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transformationJobs)
    .where(
      and(
        or(
          eq(transformationJobs.status, "pending"),
          and(
            eq(transformationJobs.status, "processing"),
            lt(transformationJobs.startedAt, staleThreshold),
          ),
        ),
        lt(transformationJobs.attempts, 3),
      ),
    );

  return {
    processed: claimed.length,
    succeeded,
    failed,
    remainingPending: remaining?.count ?? 0,
  };
}

// Processes all claimable jobs tied to a single raw article.
export async function processJobsForRawArticle(rawArticleId: string): Promise<ProcessResult> {
  // Jobs that have been processing for longer than 10 minutes are considered stale and can be reclaimed.
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

  const claimable = await db
    .select({ id: transformationJobs.id })
    .from(transformationJobs)
    .where(
      and(
        eq(transformationJobs.rawArticleId, rawArticleId),
        or(
          eq(transformationJobs.status, "pending"),
          and(
            eq(transformationJobs.status, "processing"),
            lt(transformationJobs.startedAt, staleThreshold),
          ),
        ),
        lt(transformationJobs.attempts, 3),
      ),
    )
    .orderBy(asc(transformationJobs.createdAt));

  if (claimable.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, remainingPending: 0 };
  }

  const ids = claimable.map((r) => r.id);
  const claimed = await db
    .update(transformationJobs)
    .set({
      status: "processing",
      startedAt: new Date(),
      attempts: sql`${transformationJobs.attempts} + 1`,
    })
    .where(inArray(transformationJobs.id, ids))
    .returning();

  const { succeeded, failed } = await processClaimedJobs(claimed);

  const [remaining] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transformationJobs)
    .where(
      and(
        eq(transformationJobs.rawArticleId, rawArticleId),
        or(
          eq(transformationJobs.status, "pending"),
          and(
            eq(transformationJobs.status, "processing"),
            lt(transformationJobs.startedAt, staleThreshold),
          ),
        ),
        lt(transformationJobs.attempts, 3),
      ),
    );

  return {
    processed: claimed.length,
    succeeded,
    failed,
    remainingPending: remaining?.count ?? 0,
  };
}

// Runs each claimed job and writes done/failed status back to DB.
async function processClaimedJobs(
  claimed: TransformationJobRow[],
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const job of claimed) {
    try {
      if (job.transformationType === "humorous") {
        await processHumorousJob(job.rawArticleId);
      } else if (job.transformationType === "embedding") {
        const skipped = await processEmbeddingJob(job.id, job.rawArticleId);
        if (skipped) continue; // stays pending, picked up next batch
      }
      await db
        .update(transformationJobs)
        .set({ status: "done", completedAt: new Date() })
        .where(eq(transformationJobs.id, job.id));
      succeeded += 1;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await db
        .update(transformationJobs)
        .set({ status: "failed", completedAt: new Date(), errorMessage })
        .where(eq(transformationJobs.id, job.id));
      failed += 1;
    }
  }

  return { succeeded, failed };
}

// Generates a humorous rewrite and upserts it as an article variant.
async function processHumorousJob(rawArticleId: string): Promise<void> {
  const [raw] = await db
    .select({
      title: rawArticles.title,
      rawContent: rawArticles.rawContent,
      feedId: rawArticles.feedId,
      publishedAt: rawArticles.publishedAt,
    })
    .from(rawArticles)
    .where(eq(rawArticles.id, rawArticleId));

  if (!raw) throw new Error(`raw_article ${rawArticleId} not found`);

  const transformed = await generateHumorousTransform(raw.title, raw.rawContent);

  await db
    .insert(articles)
    .values({
      rawArticleId,
      feedId: raw.feedId,
      publishedAt: raw.publishedAt,
      transformationType: "humorous",
      title: transformed.title,
      content: transformed.content,
    })
    .onConflictDoUpdate({
      target: [articles.rawArticleId, articles.transformationType],
      set: {
        feedId: raw.feedId,
        publishedAt: raw.publishedAt,
        title: transformed.title,
        content: transformed.content,
      },
    });
}

// Returns true when skipped because the source article is not ready yet.
// Creates and stores an embedding on the humorous article variant, using raw source content.
// This is implemented now to prepare data for future similarity detection/search.
async function processEmbeddingJob(jobId: string, rawArticleId: string): Promise<boolean> {
  void jobId; // reserved for future use
  const [humorous] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(
      and(
        eq(articles.rawArticleId, rawArticleId),
        eq(articles.transformationType, "humorous"),
      ),
    );

  if (!humorous) return true;

  const [raw] = await db
    .select({ rawContent: rawArticles.rawContent })
    .from(rawArticles)
    .where(eq(rawArticles.id, rawArticleId));

  if (!raw) return true;

  const embedding = await generateEmbedding(raw.rawContent);

  await db
    .update(articles)
    .set({ embedding })
    .where(eq(articles.id, humorous.id));

  return false;
}
