import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { processJobsForRawArticle } from "@/src/features/feeds/services/process-articles";
import { db } from "@/src/db/client";
import { rawArticles, transformationJobs } from "@/src/db/schema";
import type { TransformationJobInsert } from "@/src/db/types";
import { env } from "@/src/env";

export async function POST(req: Request) {
  const providedKey = req.headers.get("x-admin-key");

  if (providedKey !== env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawArticleId: string | null = null;
  try {
    const body = await req.json();
    rawArticleId = typeof body?.rawArticleId === "string" ? body.rawArticleId : null;
  } catch {
    rawArticleId = null;
  }

  if (!rawArticleId) {
    return NextResponse.json({ error: "rawArticleId is required" }, { status: 400 });
  }

  const [rawArticle] = await db
    .select({ id: rawArticles.id })
    .from(rawArticles)
    .where(eq(rawArticles.id, rawArticleId))
    .limit(1);

  if (!rawArticle) {
    return NextResponse.json({ error: "raw_article not found" }, { status: 404 });
  }

  const jobResetValues = [
    { rawArticleId, transformationType: "humorous", status: "pending" },
    { rawArticleId, transformationType: "embedding", status: "pending" },
  ] satisfies TransformationJobInsert[];

  await db
    .insert(transformationJobs)
    .values(jobResetValues)
    .onConflictDoUpdate({
      target: [transformationJobs.rawArticleId, transformationJobs.transformationType],
      set: {
        status: "pending",
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

  const result = await processJobsForRawArticle(rawArticleId);
  return NextResponse.json({ status: "ok", rawArticleId, ...result });
}
