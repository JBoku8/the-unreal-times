---
name: shadcn-ui-system
description: Use when adding UI components, styling with Tailwind, or using the cn() utility. Covers Tailwind v4 PostCSS setup, the cn() merge utility, shadcn-style component primitives, CVA variants, and lucide-react icon usage.
---

# UI Component System

## Tailwind v4

This project uses **Tailwind v4** — the configuration model changed significantly from v4.

```ts
// tailwind.config.ts exists but v4 auto-detects content
// PostCSS plugin: @tailwindcss/postcss (not tailwindcss directly)
// No purge/content array needed — v4 scans automatically
```

**Notable v4 changes relevant to this codebase:**
- `bg-linear-to-br` replaces `bg-gradient-to-br`
- `backdrop-blur-*` and `bg-white/55` (opacity modifier) work as expected
- No `@apply` for complex utilities — compose via `cn()`

## cn() Utility

```ts
// src/utils/cn.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Use `cn()` whenever classes are conditionally composed or could conflict:

```ts
import { cn } from "@/src/utils/cn"

<div className={cn("base-class", isActive && "active-class", className)} />
```

## Component Primitives

Location: `components/ui/` — `button.tsx`, `input.tsx`, `card.tsx`, `textarea.tsx`

These are shadcn-style: no external library, owned source files. Edit them directly.

**Button with CVA variants:**
```tsx
// components/ui/button.tsx uses class-variance-authority
// Custom variant used in the codebase:
<Button variant="satireAccent" disabled={!canSend}>Send</Button>
```

To add a new variant, edit `buttonVariants` in `components/ui/button.tsx`.

## Icons

```ts
import { ArrowLeft, ExternalLink, Loader2, MessageCircle, Sparkles, SendHorizontal } from "lucide-react"

// Always add aria-hidden to decorative icons
<ArrowLeft className="h-4 w-4" aria-hidden />
```

Icon size convention: `h-4 w-4` for inline, `h-5 w-5` for standalone.

## Design Tokens in Use

| Token | Usage |
|-------|-------|
| `text-violet-700` | Brand accent, links, labels |
| `bg-slate-800` / `to-violet-700/85` | Primary gradient (header, hero) |
| `text-slate-900` | Headings |
| `text-zinc-600` | Secondary text |
| `border-zinc-300/40` | Dividers and card borders |
| `font-mono text-[0.65rem] uppercase tracking-wider` | Overline labels |
| `font-display` | Heading font class (defined in layout) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `twMerge` or `clsx` directly | Always use `cn()` from `@/src/utils/cn` |
| Adding Tailwind config for v3 purge paths | Not needed — v4 auto-scans |
| `bg-gradient-to-br` | Use `bg-linear-to-br` in v4 |
| Installing shadcn components via CLI | Components are hand-owned — edit `components/ui/` directly |
