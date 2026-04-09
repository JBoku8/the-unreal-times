import Link from "next/link";
import { cn } from "@/src/utils/cn";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

function pageWindow(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 2;
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);

  const pages: Array<number | "…"> = [1];

  if (rangeStart > 2) pages.push("…");
  for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);
  if (rangeEnd < total - 1) pages.push("…");

  pages.push(total);
  return pages;
}

export function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(currentPage, totalPages);
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1">
      <Link
        href={buildHref(currentPage - 1)}
        aria-disabled={isFirst}
        tabIndex={isFirst ? -1 : undefined}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900",
          isFirst && "pointer-events-none opacity-40",
        )}
      >
        ← Prev
      </Link>

      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex h-9 w-9 items-center justify-center text-sm text-zinc-400"
            >
              …
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                p === currentPage
                  ? "border-violet-700 bg-violet-700 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900",
              )}
            >
              {p}
            </Link>
          ),
        )}
      </div>

      <Link
        href={buildHref(currentPage + 1)}
        aria-disabled={isLast}
        tabIndex={isLast ? -1 : undefined}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900",
          isLast && "pointer-events-none opacity-40",
        )}
      >
        Next →
      </Link>
    </nav>
  );
}
