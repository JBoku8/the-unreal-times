import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { feeds, rawArticles, transformationJobs } from "@/src/db/schema";
import type {
  FeedInsert,
  RawArticleInsert,
  TransformationJobInsert,
} from "@/src/db/types";
import { fetchFeeds } from "@/src/features/feeds/services/fetch-feeds";
import { env } from "@/src/env";

function getFeedUrls() {
  return env.RSS_FEED_URLS.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const providedKey = req.headers.get("x-admin-key");

  if (providedKey !== env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const feedUrls = getFeedUrls();
  if (feedUrls.length === 0) {
    return NextResponse.json(
      { error: "No RSS_FEED_URLS configured" },
      { status: 400 },
    );
  }

  const fetched = await fetchFeeds(feedUrls);
  let upsertedRawArticles = 0;
  let updatedFeeds = 0;
  let jobsCreated = 0;

  for (const item of fetched) {
    const feedUpsertValues = {
      url: item.feedUrl,
      title: item.feedTitle,
      description: item.feedDescription ?? "",
      lastFetchedAt: new Date(),
    } satisfies FeedInsert;

    const [feed] = await db
      .insert(feeds)
      .values(feedUpsertValues)
      .onConflictDoUpdate({
        target: feeds.url,
        set: {
          title: item.feedTitle,
          description: item.feedDescription ?? "",
          lastFetchedAt: new Date(),
        },
      })
      .returning({ id: feeds.id });

    if (feed) updatedFeeds += 1;

    const rawArticleUpsertValues = {
      feedId: feed.id,
      sourceName: item.sourceName,
      title: item.title,
      rawContent: item.content,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      publishedAt: item.publishedAt,
    } satisfies RawArticleInsert;

    const [rawArticle] = await db
      .insert(rawArticles)
      .values(rawArticleUpsertValues)
      .onConflictDoUpdate({
        target: rawArticles.url,
        set: {
          title: item.title,
          rawContent: item.content,
          thumbnailUrl: item.thumbnailUrl,
          publishedAt: item.publishedAt,
        },
      })
      .returning({ id: rawArticles.id });

    if (rawArticle) upsertedRawArticles += 1;

    // Create transformation jobs (idempotent — ON CONFLICT DO NOTHING)
    const jobValues = [
      { rawArticleId: rawArticle.id, transformationType: "humorous" },
      { rawArticleId: rawArticle.id, transformationType: "embedding" },
    ] satisfies TransformationJobInsert[];

    const inserted = await db
      .insert(transformationJobs)
      .values(jobValues)
      .onConflictDoNothing()
      .returning({ id: transformationJobs.id });

    jobsCreated += inserted.length;
  }

  return NextResponse.json({
    status: "ok",
    feedsProcessed: feedUrls.length,
    feedRowsUpserted: updatedFeeds,
    rawArticleRowsUpserted: upsertedRawArticles,
    transformationJobsCreated: jobsCreated,
  });
}
