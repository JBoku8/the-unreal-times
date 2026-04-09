import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generateHumorousTransform } from "@/src/ai/transform";
import { db } from "@/src/db/client";
import { rawArticles } from "@/src/db/schema";
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
    .select({
      id: rawArticles.id,
      title: rawArticles.title,
      rawContent: rawArticles.rawContent,
      sourceName: rawArticles.sourceName,
    })
    .from(rawArticles)
    .where(eq(rawArticles.id, rawArticleId))
    .limit(1);

  if (!rawArticle) {
    return NextResponse.json({ error: "raw_article not found" }, { status: 404 });
  }

  try {
    const transformed = await generateHumorousTransform(rawArticle.title, rawArticle.rawContent);
    return NextResponse.json({
      rawArticle,
      transformed,
      persisted: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transformation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
