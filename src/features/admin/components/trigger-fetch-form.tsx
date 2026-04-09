"use client";

import { type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type FetchFeedsResponse = {
  feedsProcessed?: number;
  feedRowsUpserted?: number;
  rawArticleRowsUpserted?: number;
  transformationJobsCreated?: number;
};

class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function postFetchFeeds(adminKey: string): Promise<FetchFeedsResponse> {
  const res = await fetch("/api/admin/fetch-feeds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`,
    );
  }

  return body as FetchFeedsResponse;
}

export function TriggerFetchForm({ adminKey }: { adminKey: string }) {
  const fetchFeedsMutation = useMutation<FetchFeedsResponse, Error>({
    mutationFn: () => postFetchFeeds(adminKey),
    onSuccess: (data) => {
      const rawArticlesInserted = data.rawArticleRowsUpserted ?? 0;
      toast.success(
        `Feeds processed: ${data.feedsProcessed ?? "?"} · Raw articles inserted: ${rawArticlesInserted}`,
      );
    },
    onError: (error) => {
      toast.error(error.message || "Network error while calling the API.");
    },
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await fetchFeedsMutation.mutateAsync();
  };

  return (
    <form onSubmit={submit}>
      <h2 className="font-display text-xl font-semibold text-slate-900">
        Run ingestion
      </h2>
      <p className="mt-2 text-sm text-zinc-600">
        Uses <code className="rounded bg-zinc-100 px-1">RSS_FEED_URLS</code> from the server
        environment. Your admin key is sent only to your own API and is not stored.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="satireAccent"
          disabled={!adminKey.trim() || fetchFeedsMutation.isPending}
        >
          {fetchFeedsMutation.isPending ? "Fetching..." : "Fetch feeds now"}
        </Button>
        {fetchFeedsMutation.isSuccess ? (
          <Button type="button" variant="satireOutline" onClick={() => window.location.reload()}>
            Refresh dashboard
          </Button>
        ) : null}
      </div>
    </form>
  );
}
