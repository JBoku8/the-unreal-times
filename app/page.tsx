import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Clock, ExternalLink, Loader2 } from "lucide-react";
import { db } from "@/src/db/client";
import { articles, feeds, rawArticles, transformationJobs } from "@/src/db/schema";
import { Pagination } from "@/components/ui/pagination";
import { buildPageHref, parsePage } from "@/src/utils/pagination";

const PAGE_SIZE = 9;

type HomeSearchParams = Promise<{ feed?: string | string[]; page?: string }>;

function normalizeFeedQuery(value: string | string[] | undefined): string[] {
  if (!value) return [];

  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map((entry) => entry.trim()).filter(Boolean))];
}

function buildFeedHref(selectedFeedIds: string[], feedId: string): string {
  const nextSelected = selectedFeedIds.includes(feedId)
    ? selectedFeedIds.filter((id) => id !== feedId)
    : [...selectedFeedIds, feedId];

  if (nextSelected.length === 0) return "/";

  const params = new URLSearchParams();
  for (const id of nextSelected) {
    params.append("feed", id);
  }

  return `/?${params.toString()}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedFeedIds = normalizeFeedQuery(resolvedSearchParams.feed);
  const page = parsePage(resolvedSearchParams.page);
  const offset = (page - 1) * PAGE_SIZE;

  let feedOptions: Array<{ id: string; title: string }> = [];
  let articleRows: Array<{
    id: string;
    title: string;
    publishedAt: Date | null;
    url: string;
    humorousStatus: string | null;
    feedId: string;
    feedTitle: string;
  }> = [];
  let totalCount = 0;

  const feedFilter =
    selectedFeedIds.length > 0 ? inArray(articles.feedId, selectedFeedIds) : undefined;

  try {
    const [countRow, ...rest] = await Promise.all([
      db
        .select({ total: count() })
        .from(articles)
        .where(and(eq(articles.transformationType, "humorous"), feedFilter))
        .then(([row]) => row),
      db
        .select({
          id: feeds.id,
          title: feeds.title,
        })
        .from(feeds)
        .orderBy(feeds.title),
      db
        .select({
          id: articles.id,
          title: articles.title,
          publishedAt: articles.publishedAt,
          url: rawArticles.url,
          humorousStatus: transformationJobs.status,
          feedId: articles.feedId,
          feedTitle: feeds.title,
        })
        .from(articles)
        .innerJoin(rawArticles, eq(articles.rawArticleId, rawArticles.id))
        .innerJoin(feeds, eq(articles.feedId, feeds.id))
        .leftJoin(
          transformationJobs,
          and(
            eq(transformationJobs.rawArticleId, rawArticles.id),
            eq(transformationJobs.transformationType, "humorous"),
          ),
        )
        .where(and(eq(articles.transformationType, "humorous"), feedFilter))
        .orderBy(desc(articles.publishedAt))
        .limit(PAGE_SIZE)
        .offset(offset),
    ]);
    totalCount = Number(countRow?.total ?? 0);
    [feedOptions, articleRows] = rest as [typeof feedOptions, typeof articleRows];
  } catch {
    feedOptions = [];
    articleRows = [];
    totalCount = 0;
  }

  const selectedFeedSet = new Set(selectedFeedIds);
  const hasActiveFilters = selectedFeedIds.length > 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <section className="border-b border-zinc-300/40 bg-linear-to-br from-zinc-100 via-slate-50 to-[#e9ddff]/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-violet-700">
            Home feed · MVP
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Breaking calm, delivered with a straight face.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600">
            Read what your feeds published—then open any story to interrogate it with an assistant that
            stays inside the article.
          </p>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        {feedOptions.length > 0 && (
          <section className="rounded-xl bg-white px-5 py-4 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-violet-700">
                Filter by feed
              </p>
              {hasActiveFilters && (
                <Link
                  href={"/"}
                  className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-slate-900 hover:underline"
                >
                  Clear filters
                </Link>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {feedOptions.map((feed) => {
                const isSelected = selectedFeedSet.has(feed.id);

                return (
                  <Link
                    key={feed.id}
                    href={buildFeedHref(selectedFeedIds, feed.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-violet-700 bg-violet-700 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
                    }`}
                  >
                    {feed.title}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {articleRows.length === 0 ? (
          <div className="rounded-xl bg-white px-6 py-12 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.08)]">
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              {hasActiveFilters ? "No matches for selected feeds" : "The newsroom is quiet"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
              {hasActiveFilters ? (
                <>
                  There are no articles for the selected feed filters yet. Adjust your filters, or clear
                  them to view everything.
                </>
              ) : (
                <>
                  No articles yet. Run the scraper from the admin page (with your admin key), or use curl
                  against{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5">
                    /api/admin/fetch-feeds
                  </code>
                  .
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              {hasActiveFilters && (
                <Link
                  href={"/"}
                  className="inline-flex text-sm font-semibold text-zinc-700 underline-offset-4 hover:underline"
                >
                  Clear filters
                </Link>
              )}
              <Link
                href="/admin/scraper"
                className="inline-flex text-sm font-semibold text-violet-700 underline-offset-4 hover:underline"
              >
                Open scraper dashboard →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {articleRows.map((article, index) => {
              const host = (() => {
                try {
                  return new URL(article.url).host;
                } catch {
                  return article.url;
                }
              })();
              const isLead = index === 0;

              return (
                <article
                  key={article.id}
                  className={`group flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_40px_-10px_rgba(25,28,30,0.06)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-12px_rgba(25,28,30,0.1)] ${
                    isLead ? "sm:col-span-2 xl:col-span-2 xl:flex-row" : ""
                  }`}
                >
                  <div
                    className={`relative bg-linear-to-br from-slate-800 to-violet-700/90 ${isLead ? "xl:w-1/2" : "h-36 sm:h-40"}`}
                  >
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                        Source
                      </span>
                      <span className="rounded-full bg-violet-700/90 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-white">
                        Chat ready
                      </span>
                      {article.humorousStatus !== "done" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          Processing
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`flex flex-1 flex-col p-6 ${isLead ? "xl:w-1/2 xl:justify-center" : ""}`}>
                    <Link href={`/article/${article.id}`} className="block">
                      <h2
                        className={`font-display font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-violet-700 ${
                          isLead ? "text-2xl sm:text-3xl" : "text-xl"
                        }`}
                      >
                        {article.title}
                      </h2>
                    </Link>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleString()
                          : "Unknown date"}
                      </span>
                      <span className="text-zinc-400">·</span>
                      <span>{article.feedTitle}</span>
                      <span className="text-zinc-400">·</span>
                      <span>{host}</span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/article/${article.id}`}
                        className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900"
                      >
                        Read &amp; chat
                      </Link>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 underline-offset-4 hover:underline"
                      >
                        Original
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            buildHref={(p) => buildPageHref("/", { feed: selectedFeedIds }, p)}
          />
        )}
      </main>
    </div>
  );
}
