import { count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/src/db/client";
import { articles, feeds, rawArticles } from "@/src/db/schema";
import type { FeedRow, RawArticleRow } from "@/src/db/types";

export type ScraperDashboardData = {
  feedRows: Array<Pick<FeedRow, "id" | "url" | "title" | "lastFetchedAt">>;
  untransformedCount: number;
  transformedCount: number;
  recentRawArticles: Array<Pick<RawArticleRow, "id" | "title" | "sourceName" | "createdAt">>;
  countsByFeed: Record<string, number>;
};

export async function getScraperDashboardData(): Promise<ScraperDashboardData> {
  let feedRows: ScraperDashboardData["feedRows"] = [];
  let untransformedCount = 0;
  let transformedCount = 0;
  let recentRawArticles: ScraperDashboardData["recentRawArticles"] = [];

  try {
    feedRows = await db.query.feeds.findMany({
      columns: { id: true, url: true, title: true, lastFetchedAt: true },
      orderBy: desc(feeds.lastFetchedAt),
    });
    const [untransformedRow] = await db
      .select({ total: count() })
      .from(rawArticles)
      .leftJoin(articles, eq(articles.rawArticleId, rawArticles.id))
      .where(isNull(articles.id));
    untransformedCount = Number(untransformedRow?.total ?? 0);

    const [transformedRow] = await db.select({ total: count() }).from(articles);
    transformedCount = Number(transformedRow?.total ?? 0);
  } catch {
    feedRows = [];
    untransformedCount = 0;
    transformedCount = 0;
  }

  try {
    recentRawArticles = await db
      .select({
        id: rawArticles.id,
        title: rawArticles.title,
        sourceName: rawArticles.sourceName,
        createdAt: rawArticles.createdAt,
      })
      .from(rawArticles)
      .leftJoin(articles, eq(articles.rawArticleId, rawArticles.id))
      .where(isNull(articles.id))
      .orderBy(desc(rawArticles.createdAt))
      .limit(20);
  } catch {
    recentRawArticles = [];
  }

  const countsByFeed: Record<string, number> = {};
  try {
    const countRows = await db
      .select({ feedId: rawArticles.feedId, n: count() })
      .from(rawArticles)
      .groupBy(rawArticles.feedId);
    for (const row of countRows) {
      countsByFeed[row.feedId] = Number(row.n);
    }
  } catch {
    // Leave feed counts empty on DB errors.
  }

  return { feedRows, untransformedCount, transformedCount, recentRawArticles, countsByFeed };
}
