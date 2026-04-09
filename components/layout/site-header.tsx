import Link from "next/link";
import { Newspaper, Radar, Search, Settings2 } from "lucide-react";
import { cn } from "@/src/utils/cn";

const nav = [
  { href: "/", label: "Home feed", icon: Newspaper },
  { href: "/search", label: "Search & explore", icon: Search },
  { href: "/admin/scraper", label: "Scraper", icon: Radar },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-300/40 bg-slate-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 text-slate-900 transition-opacity hover:opacity-90"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-white">
            <Newspaper className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight">
              The Unreal Times
            </span>
            <span className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Satire reader
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-900 transition-colors",
                "hover:bg-zinc-100",
              )}
            >
              <Icon className="h-4 w-4 text-violet-700" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 font-mono text-[0.65rem] font-medium uppercase tracking-widest text-zinc-500 md:flex">
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          MVP
        </div>
      </div>
    </header>
  );
}
