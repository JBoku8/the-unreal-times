"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FeedFilterChipsProps = {
  feedOptions: Array<{ id: string; title: string }>;
  selectedFeedIds: string[];
};

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

export function FeedFilterChips({ feedOptions, selectedFeedIds }: FeedFilterChipsProps) {
  const router = useRouter();
  const [optimisticSelectedIds, setOptimisticSelectedIds] = useState(selectedFeedIds);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOptimisticSelectedIds(selectedFeedIds);
  }, [selectedFeedIds]);

  const selectedFeedSet = useMemo(() => new Set(optimisticSelectedIds), [optimisticSelectedIds]);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {feedOptions.map((feed) => {
        const isSelected = selectedFeedSet.has(feed.id);

        return (
          <button
            key={feed.id}
            type="button"
            onClick={() => {
              const nextSelected = isSelected
                ? optimisticSelectedIds.filter((id) => id !== feed.id)
                : [...optimisticSelectedIds, feed.id];
              const nextHref = buildFeedHref(optimisticSelectedIds, feed.id);
              setOptimisticSelectedIds(nextSelected);
              startTransition(() => {
                router.replace(nextHref, { scroll: false });
                router.refresh();
              });
            }}
            disabled={isPending}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? "border-violet-700 bg-violet-700 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
            } ${isPending ? "cursor-progress opacity-90" : ""}`}
            aria-pressed={isSelected}
          >
            {feed.title}
          </button>
        );
      })}
    </div>
  );
}
