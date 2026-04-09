import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { articles, rawArticles } from "@/src/db/schema";
import { env } from "@/src/env";

type RequestBody = {
  feedId?: string;
};

export async function POST(req: Request) {
  const providedKey = req.headers.get("x-admin-key");
  if (providedKey !== env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const feedId = typeof body.feedId === "string" && body.feedId.trim() ? body.feedId.trim() : null;

  try {
    const rows = await db
      .select({
        id: rawArticles.id,
        title: rawArticles.title,
        sourceName: rawArticles.sourceName,
        createdAt: rawArticles.createdAt,
      })
      .from(rawArticles)
      .leftJoin(articles, eq(articles.rawArticleId, rawArticles.id))
      .where(
        and(
          isNull(articles.id),
          feedId ? eq(rawArticles.feedId, feedId) : undefined,
        ),
      )
      .orderBy(desc(rawArticles.createdAt))
      .limit(50);

    return NextResponse.json({ status: "ok", rawArticles: rows });
  } catch {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
