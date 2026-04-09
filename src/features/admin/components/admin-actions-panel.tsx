"use client";

import { useState } from "react";
import Link from "next/link";
import { TriggerFetchForm } from "./trigger-fetch-form";
import { TriggerTransformForm } from "./trigger-transform-form";
import type { RawArticleRow, FeedRow } from "@/src/db/types";

type RawArticlePreview = Pick<RawArticleRow, "id" | "title" | "sourceName" | "createdAt">;
type FeedPreview = Pick<FeedRow, "id" | "url" | "title" | "lastFetchedAt">;

export function AdminActionsPanel({
  rawArticles,
  feedRows,
  countsByFeed,
}: {
  rawArticles: RawArticlePreview[];
  feedRows: FeedPreview[];
  countsByFeed: Record<string, number>;
}) {
  const [adminKey, setAdminKey] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-300/40 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-zinc-900">
          <span className="mb-2 block font-mono text-[0.65rem] uppercase tracking-widest text-zinc-500">
            Admin key
          </span>
          <input
            type="password"
            autoComplete="off"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="w-full rounded-md border-0 border-b-2 border-zinc-300 bg-zinc-100/50 px-3 py-2.5 text-zinc-900 outline-none transition-[border-color,box-shadow] focus:border-violet-700 focus:ring-2 focus:ring-violet-700/20"
            placeholder="Matches ADMIN_KEY on the server"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="flex max-h-[600px] flex-col rounded-xl border border-zinc-300/40 bg-white p-6 shadow-sm">
          <div className="flex-none">
            <TriggerFetchForm adminKey={adminKey} />
          </div>
          <div className="mt-6 flex min-h-0 flex-1 flex-col border-t border-zinc-300/40 pt-6">
            <p className="mb-3 flex-none font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
              Feed inventory
            </p>
            {feedRows.length === 0 ? (
              <p className="text-sm text-zinc-600">No feeds recorded yet.</p>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-zinc-300/40 overflow-y-auto pr-1">
                {feedRows.map((feed) => (
                  <li key={feed.id} className="py-3 first:pt-0">
                    <p className="font-medium text-slate-900">{feed.title}</p>
                    <p className="mt-0.5 break-all text-xs text-zinc-600">{feed.url}</p>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span>
                        Last fetch:{" "}
                        {feed.lastFetchedAt
                          ? new Date(feed.lastFetchedAt).toLocaleString()
                          : "—"}
                      </span>
                      <span>·</span>
                      <span>{countsByFeed[feed.id] ?? 0} articles</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex max-h-[600px] flex-col rounded-xl border border-zinc-300/40 bg-white p-6 shadow-sm">
          <div className="flex-none">
            <h2 className="font-display text-xl font-semibold text-slate-900">Transform</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Run preview-only transformation checks or reprocess individual{" "}
              <code className="rounded bg-zinc-100 px-1">raw_articles</code> through the pipeline.
            </p>
            <Link
              href="/admin/transform-test"
              className="mt-4 inline-flex rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800"
            >
              Open transformation test page →
            </Link>
          </div>
          <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-zinc-300/40 pt-5">
            <p className="mb-3 flex-none font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
              Individual articles
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <TriggerTransformForm
                rawArticles={rawArticles}
                feedRows={feedRows}
                adminKey={adminKey}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
