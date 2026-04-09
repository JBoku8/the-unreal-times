import Link from "next/link";
import { Suspense } from "react";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/src/db/client";
import { articles, rawArticles } from "@/src/db/schema";
import type { ArticleRow, RawArticleRow } from "@/src/db/types";
import { Pagination } from "@/components/ui/pagination";
import { buildPageHref, parsePage } from "@/src/utils/pagination";
import { hostnameFromUrl } from "@/src/utils/url";
import { SearchForm } from "./search-form";

const SEARCH_PAGE_SIZE = 40;
const BROWSE_PAGE_SIZE = 16;

function sanitizeLikeFragment(raw: string) {
  return raw.trim().slice(0, 200).replace(/[%_\\]/g, "");
}

type SearchPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

type SearchResultRow = Pick<ArticleRow, "id" | "title"> &
  Pick<RawArticleRow, "publishedAt" | "url">;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: rawQ, page: rawPage } = await searchParams;
  const fragment = rawQ ? sanitizeLikeFragment(rawQ) : "";
  const hasQuery = fragment.length > 0;
  const page = parsePage(rawPage);
  const pageSize = hasQuery ? SEARCH_PAGE_SIZE : BROWSE_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  let results: SearchResultRow[] = [];
  let totalCount = 0;

  try {
    if (hasQuery) {
      const pattern = `%${fragment}%`;
      const whereClause = and(
        eq(articles.transformationType, "humorous"),
        or(ilike(articles.title, pattern), ilike(articles.content, pattern)),
      );
      const [countRow, rows] = await Promise.all([
        db
          .select({ total: count() })
          .from(articles)
          .innerJoin(rawArticles, eq(articles.rawArticleId, rawArticles.id))
          .where(whereClause)
          .then(([row]) => row),
        db
          .select({
            id: articles.id,
            title: articles.title,
            publishedAt: rawArticles.publishedAt,
            url: rawArticles.url,
          })
          .from(articles)
          .innerJoin(rawArticles, eq(articles.rawArticleId, rawArticles.id))
          .where(whereClause)
          .orderBy(desc(rawArticles.publishedAt))
          .limit(pageSize)
          .offset(offset),
      ]);
      totalCount = Number(countRow?.total ?? 0);
      results = rows;
    } else {
      const whereClause = eq(articles.transformationType, "humorous");
      const [countRow, rows] = await Promise.all([
        db
          .select({ total: count() })
          .from(articles)
          .where(whereClause)
          .then(([row]) => row),
        db
          .select({
            id: articles.id,
            title: articles.title,
            publishedAt: rawArticles.publishedAt,
            url: rawArticles.url,
          })
          .from(articles)
          .innerJoin(rawArticles, eq(articles.rawArticleId, rawArticles.id))
          .where(whereClause)
          .orderBy(desc(rawArticles.publishedAt))
          .limit(pageSize)
          .offset(offset),
      ]);
      totalCount = Number(countRow?.total ?? 0);
      results = rows;
    }
  } catch {
    results = [];
    totalCount = 0;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  let totalApprox = 0;
  try {
    const [row] = await db.select({ total: count() }).from(rawArticles);
    totalApprox = Number(row?.total ?? 0);
  } catch {
    totalApprox = 0;
  }

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <section className="border-b border-zinc-300/40 bg-zinc-100">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="mb-2 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-violet-700">
            Search &amp; explore · MVP
          </p>
          <h1 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
            Find the needle in the newsstack.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-600">
            Search titles and article bodies. Showing {totalApprox} stor{totalApprox === 1 ? "y" : "ies"} in
            the database.
          </p>
          <div className="mt-8 max-w-2xl">
            <Suspense
              fallback={
                <div className="h-14 animate-pulse rounded-md bg-zinc-200/80" />
              }
            >
              <SearchForm initialQuery={hasQuery ? fragment : ""} />
            </Suspense>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <h2 className="font-display mb-6 flex items-center gap-2 text-xl font-semibold text-slate-900">
          <Search className="h-5 w-5 text-violet-700" aria-hidden />
          {hasQuery ? `Results for “${fragment}”` : "Latest to browse"}
        </h2>

        {results.length === 0 ? (
          <p className="text-sm text-zinc-600">
            {hasQuery
              ? "No matches. Try a shorter phrase or different keywords."
              : "No articles yet—run the scraper, then come back."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-300/40 rounded-xl border border-zinc-300/40 bg-white">
            {results.map((article) => {
              const host = hostnameFromUrl(article.url);
              return (
                <li key={article.id}>
                  <Link
                    href={`/article/${article.id}`}
                    className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-zinc-100/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div>
                      <span className="font-medium text-slate-900">{article.title}</span>
                      <div className="mt-1 text-xs text-zinc-600">
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleString()
                          : "Unknown date"}{" "}
                        · {host}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-violet-700">
                      Open →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            buildHref={(p) => buildPageHref("/search", { q: rawQ }, p)}
          />
        )}
      </main>
    </div>
  );
}
