"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FeedRow, RawArticleRow } from "@/src/db/types";

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

class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function postTransformArticle(
  adminKey: string,
  rawArticleId: string,
): Promise<TransformArticleResponse> {
  const res = await fetch("/api/admin/transform-article", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ rawArticleId }),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`,
    );
  }

  return body as TransformArticleResponse;
}

async function postRawArticlesByFeed(
  adminKey: string,
  feedId: string | null,
): Promise<RawArticlePreview[]> {
  const res = await fetch("/api/admin/raw-articles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ feedId }),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`,
    );
  }

  const parsed = body as RawArticlesResponse;
  return Array.isArray(parsed.rawArticles) ? parsed.rawArticles : [];
}

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
    mutationFn: (feedId) => postRawArticlesByFeed(adminKey, feedId),
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
    mutationFn: () => postTransformArticle(adminKey, row.id),
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
