"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FeedRow, RawArticleRow } from "@/src/db/types";
import { callAdminApi } from "@/src/features/admin/api-client";

type RawArticlePreview = Pick<RawArticleRow, "id" | "title" | "sourceName" | "createdAt">;
type FeedPreview = Pick<FeedRow, "id" | "title">;

type TransformArticleResponse = {
  processed?: number;
  succeeded?: number;
  failed?: number;
};

type RawArticlesResponse = {
  rawArticles?: RawArticlePreview[];
};

export function TriggerTransformForm({
  rawArticles,
  feedRows,
  adminKey,
}: {
  rawArticles: RawArticlePreview[];
  feedRows: FeedPreview[];
  adminKey: string;
}) {
  const isKeyMissing = adminKey.trim().length === 0;
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [loadedArticles, setLoadedArticles] = useState<RawArticlePreview[] | null>(null);

  const rawArticlesQueryMutation = useMutation<RawArticlePreview[], Error, string | null>({
    mutationFn: (feedId) =>
      callAdminApi<RawArticlesResponse>("/api/admin/raw-articles", adminKey, { feedId }).then(
        (data) => (Array.isArray(data.rawArticles) ? data.rawArticles : []),
      ),
    onSuccess: (data) => {
      setLoadedArticles(data);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to load raw articles.");
    },
  });

  const displayedArticles = useMemo(
    () => (selectedFeedId ? (loadedArticles ?? []) : rawArticles),
    [loadedArticles, rawArticles, selectedFeedId],
  );

  const handleFeedSelect = (feedId: string | null) => {
    setSelectedFeedId(feedId);
    if (feedId === null) {
      setLoadedArticles(null);
      return;
    }
    if (isKeyMissing) {
      toast.error("Enter admin key to load feed-specific raw articles.");
      return;
    }
    rawArticlesQueryMutation.mutate(feedId);
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleFeedSelect(null)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            selectedFeedId === null
              ? "border-violet-700 bg-violet-700 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
          }`}
        >
          All feeds
        </button>
        {feedRows.map((feed) => {
          const isSelected = selectedFeedId === feed.id;
          return (
            <button
              key={feed.id}
              type="button"
              onClick={() => handleFeedSelect(feed.id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-violet-700 bg-violet-700 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
              }`}
            >
              {feed.title}
            </button>
          );
        })}
      </div>

      {rawArticlesQueryMutation.isPending ? (
        <p className="mt-3 text-sm text-zinc-600">Loading feed articles...</p>
      ) : displayedArticles.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          {selectedFeedId
            ? "No raw articles available for the selected feed."
            : "No raw articles available yet."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-300/40">
          {displayedArticles.map((row) => {
            return (
              <RawArticleTransformItem
                key={row.id}
                row={row}
                adminKey={adminKey}
                isKeyMissing={isKeyMissing}
              />
            );
          })}
        </ul>
      )}
    </>
  );
}

function RawArticleTransformItem({
  row,
  adminKey,
  isKeyMissing,
}: {
  row: RawArticlePreview;
  adminKey: string;
  isKeyMissing: boolean;
}) {
  const transformMutation = useMutation<TransformArticleResponse, Error>({
    mutationFn: () =>
      callAdminApi<TransformArticleResponse>("/api/admin/transform-article", adminKey, {
        rawArticleId: row.id,
      }),
    onSuccess: (data) => {
      toast.success(
        `Processed ${data.processed ?? 0} jobs · Success ${data.succeeded ?? 0} · Failed ${data.failed ?? 0}`,
      );
    },
    onError: (error) => {
      toast.error(error.message || "Network error while calling the API.");
    },
  });

  return (
    <li className="py-4 first:pt-0">
      <p className="font-medium text-slate-900">{row.title}</p>
      <p className="mt-1 text-xs text-zinc-600">
        {row.sourceName || "Unknown source"} · {new Date(row.createdAt).toLocaleString()}
      </p>
      <p className="mt-1 break-all font-mono text-[11px] text-zinc-500">{row.id}</p>
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="satireAccent"
          size="sm"
          disabled={isKeyMissing || transformMutation.isPending}
          onClick={() => transformMutation.mutate()}
        >
          {transformMutation.isPending ? "Transforming..." : "Transform raw_article"}
        </Button>
      </div>
    </li>
  );
}
