import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { ChatPanel } from "@/src/features/chat/components/chat-panel";
import { db } from "@/src/db/client";
import { articles, rawArticles } from "@/src/db/schema";
import type { ArticleRow, RawArticleRow } from "@/src/db/types";

type ArticlePageRow = Pick<ArticleRow, "id" | "title" | "content"> &
  Pick<RawArticleRow, "url" | "publishedAt" | "rawContent">;

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      content: articles.content,
      url: rawArticles.url,
      publishedAt: rawArticles.publishedAt,
      rawContent: rawArticles.rawContent,
    })
    .from(articles)
    .innerJoin(rawArticles, eq(articles.rawArticleId, rawArticles.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  const article: ArticlePageRow | null = rows[0] ?? null;

  if (!article) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <div className="border-b border-zinc-300/40 bg-zinc-100/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to feed
          </Link>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-white">
              Article
            </span>
            <span className="rounded-full bg-violet-700/15 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-violet-700">
              Live chat
            </span>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <article className="lg:col-span-7">
            <header className="rounded-2xl bg-white p-6 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.08)] sm:p-8">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {article.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-600">
                <time dateTime={article.publishedAt?.toISOString()}>
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleString()
                    : "Unknown date"}
                </time>
                <span className="text-zinc-400">·</span>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-violet-700 underline-offset-4 hover:underline"
                >
                  Original source
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            </header>

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-violet-700">
                Full text
              </h2>
              <div className="prose prose-neutral mt-4 max-w-none">
                <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-900">
                  {article.content}
                </p>
              </div>

              <details className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900">
                  <span className="inline-flex items-center gap-2">
                    Show original content
                    <span className="text-xs text-zinc-500">(raw)</span>
                  </span>
                </summary>
                <div className="prose prose-neutral mt-4 max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                    {article.rawContent?.trim()
                      ? article.rawContent
                      : "No original content is available for this article."}
                  </p>
                </div>
              </details>
            </div>
          </article>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <p className="mb-3 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Article &amp; chat · MVP
              </p>
              <ChatPanel articleId={article.id} articleTitle={article.title} framed />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
