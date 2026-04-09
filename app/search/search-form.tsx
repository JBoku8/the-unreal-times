"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type SearchFormProps = {
  initialQuery: string;
};

export function SearchForm({ initialQuery }: SearchFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery || "");
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    startTransition(() => {
      router.push(`/search${params.toString() ? `?${params}` : ""}`);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-zinc-900">
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-zinc-500">
          Query
        </span>
        <span className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
            placeholder="Headlines, topics, outlets…"
            className="w-full rounded-md border-0 border-b-2 border-zinc-300 bg-white/90 py-3 pl-10 pr-3 text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] focus:border-violet-700 focus:ring-2 focus:ring-violet-700/20"
          />
        </span>
      </label>
      <Button
        type="submit"
        variant="satireAccent"
        className="h-11 shrink-0 px-6"
        disabled={isPending}
      >
        {isPending ? "Searching..." : "Search"}
      </Button>
    </form>
  );
}
