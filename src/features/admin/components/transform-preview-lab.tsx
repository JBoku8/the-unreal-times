"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RawArticleRow } from "@/src/db/types";
import { callAdminApi } from "@/src/features/admin/api-client";

type RawArticlePreviewRow = Pick<
  RawArticleRow,
  "id" | "title" | "sourceName" | "createdAt" | "rawContent" | "url"
>;

type TransformPreviewResponse = {
  rawArticle: {
    id: string;
    title: string;
    rawContent: string;
    sourceName: string;
  };
  transformed: {
    title: string;
    content: string;
  };
};

export function TransformPreviewLab({ rawArticles }: { rawArticles: RawArticlePreviewRow[] }) {
  const [adminKey, setAdminKey] = useState("");
  const [selectedRawArticleId, setSelectedRawArticleId] = useState<string | null>(null);

  const previewMutation = useMutation<TransformPreviewResponse, Error, string>({
    mutationFn: (rawArticleId) =>
      callAdminApi<TransformPreviewResponse>("/api/admin/transform-preview", adminKey, {
        rawArticleId,
      }),
    onSuccess: () => {
      toast.success("Preview transform complete.");
    },
    onError: (error) => {
      toast.error(error.message || "Network error while calling the API.");
    },
  });

  const selectedRow = rawArticles.find((row) => row.id === selectedRawArticleId) ?? null;
  const previewResult = previewMutation.data;

  return (
    <div className="rounded-xl border border-zinc-300/40 bg-white p-6 shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-slate-900">Transformation test page</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Run a preview transform against existing <code className="rounded bg-zinc-100 px-1">raw_articles</code>.
        This is preview-only and does not save transformed output.
      </p>

      <label className="mt-4 block text-sm font-medium text-zinc-900">
        <span className="mb-2 block font-mono text-[0.65rem] uppercase tracking-widest text-zinc-500">
          Admin key
        </span>
        <Input
          type="password"
          autoComplete="off"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Matches ADMIN_KEY on the server"
        />
      </label>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Raw articles</h2>
          <p className="mt-1 text-xs text-zinc-600">Select one and run test transformation.</p>

          {rawArticles.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">No raw articles available yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-300/40">
              {rawArticles.map((row) => {
                const isSelected = selectedRawArticleId === row.id;
                return (
                  <li key={row.id} className="py-3 first:pt-0">
                    <p className="font-medium text-slate-900">{row.title}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {row.sourceName || "Unknown source"} · {new Date(row.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 break-all text-xs text-zinc-500">{row.url}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "secondary" : "satireOutline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedRawArticleId(row.id)}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "satireAccent" : "satireOutline"}
                        className="cursor-pointer disabled:cursor-not-allowed"
                        disabled={!isSelected || previewMutation.isPending}
                        onClick={() => {
                          setSelectedRawArticleId(row.id);
                          previewMutation.mutate(row.id);
                        }}
                      >
                        {previewMutation.isPending && isSelected
                          ? "Transforming..."
                          : "Test transform"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Preview</h2>
          <p className="mt-1 text-xs text-zinc-600">Transformed content side-by-side with original.</p>

          {!previewResult ? (
            <p className="mt-4 text-sm text-zinc-600">
              {selectedRow
                ? "Click Test transform to generate preview."
                : "Select a raw article and run transformation."}
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">Original</p>
                <h3 className="mt-2 text-sm font-semibold text-zinc-900">{previewResult.rawArticle.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                  {previewResult.rawArticle.rawContent}
                </p>
              </div>
              <div className="rounded-md border border-violet-200 bg-violet-50/50 p-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-violet-700">
                  Transformed (preview)
                </p>
                <h3 className="mt-2 text-sm font-semibold text-zinc-900">{previewResult.transformed.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                  {previewResult.transformed.content}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
