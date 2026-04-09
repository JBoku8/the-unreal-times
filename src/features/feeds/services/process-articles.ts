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

// 10 minutes — jobs stuck in "processing" longer than this are considered stale.
const STALE_JOB_MS = 10 * 60 * 1000;

function claimableWhereClause(staleThreshold: Date, rawArticleId?: string) {
  return and(
    rawArticleId ? eq(transformationJobs.rawArticleId, rawArticleId) : undefined,
    or(
      eq(transformationJobs.status, "pending"),
      and(
        eq(transformationJobs.status, "processing"),
        lt(transformationJobs.startedAt, staleThreshold),
      ),
    ),
    lt(transformationJobs.attempts, 3),
  );
}

async function countRemainingJobs(staleThreshold: Date, rawArticleId?: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transformationJobs)
    .where(claimableWhereClause(staleThreshold, rawArticleId));
  return row?.count ?? 0;
}

// Picks a limited set of eligible jobs, claims them, and runs them.
export async function processJobBatch(batchSize = 10): Promise<ProcessResult> {
  const staleThreshold = new Date(Date.now() - STALE_JOB_MS);

  const claimable = await db
    .select({ id: transformationJobs.id })
    .from(transformationJobs)
    .where(claimableWhereClause(staleThreshold))
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
  const remainingPending = await countRemainingJobs(staleThreshold);

  return { processed: claimed.length, succeeded, failed, remainingPending };
}

// Processes all claimable jobs tied to a single raw article.
export async function processJobsForRawArticle(rawArticleId: string): Promise<ProcessResult> {
  const staleThreshold = new Date(Date.now() - STALE_JOB_MS);

  const claimable = await db
    .select({ id: transformationJobs.id })
    .from(transformationJobs)
    .where(claimableWhereClause(staleThreshold, rawArticleId))
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
  const remainingPending = await countRemainingJobs(staleThreshold, rawArticleId);

  return { processed: claimed.length, succeeded, failed, remainingPending };
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
        const skipped = await processEmbeddingJob(job.rawArticleId);
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
async function processEmbeddingJob(rawArticleId: string): Promise<boolean> {
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
