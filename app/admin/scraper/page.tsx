import { CheckCheck, FlaskConical, Rss } from "lucide-react";
import { AdminActionsPanel } from "@/src/features/admin/components/admin-actions-panel";
import { getScraperDashboardData } from "@/src/features/admin/services/scraper-dashboard";

export default async function ScraperDashboardPage() {
  const { feedRows, untransformedCount, transformedCount, recentRawArticles, countsByFeed } =
    await getScraperDashboardData();

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <section className="border-b border-zinc-300/40 bg-zinc-100">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="mb-2 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-violet-700">
            Scraper dashboard · MVP
          </p>
          <h1 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
            Keep the wire humming.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-600">
            Monitor configured feeds, last fetch times, and article volume. Trigger a pull when you need
            fresh copy in the newsroom.
          </p>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-300/40 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-600">
              <Rss className="h-4 w-4 text-violet-700" aria-hidden />
              <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider">
                Feeds
              </span>
            </div>
            <p className="font-display mt-2 text-3xl font-semibold text-slate-900">
              {feedRows.length}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-300/40 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-600">
              <FlaskConical className="h-4 w-4 text-violet-700" aria-hidden />
              <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider">
                Not Transformed
              </span>
            </div>
            <p className="font-display mt-2 text-3xl font-semibold text-slate-900">
              {untransformedCount}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-300/40 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-600">
              <CheckCheck className="h-4 w-4 text-violet-700" aria-hidden />
              <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider">
                Transformed
              </span>
            </div>
            <p className="font-display mt-2 text-3xl font-semibold text-slate-900">
              {transformedCount}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-4 font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">
            ● Actions
          </p>
          <AdminActionsPanel
            rawArticles={recentRawArticles}
            feedRows={feedRows}
            countsByFeed={countsByFeed}
          />
        </div>
      </main>
    </div>
  );
}
