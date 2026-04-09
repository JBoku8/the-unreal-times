---
name: admin-scraper-dashboard
description: Use when modifying the scraper admin dashboard at /admin/scraper. Covers the server page + client panel pattern, shared admin key propagation, scrollable fixed-height cards, stat queries, and useMutation for admin actions.
---

# Admin Scraper Dashboard

## Files

| Path | Role |
|------|------|
| `app/admin/scraper/page.tsx` | Async server component — fetches data, renders stat cards, passes data to `AdminActionsPanel` |
| `src/features/admin/components/admin-actions-panel.tsx` | Client component — owns shared `adminKey` state, two-column action grid |
| `src/features/admin/components/trigger-fetch-form.tsx` | Client component — ingestion form, receives `adminKey` as prop |
| `src/features/admin/components/trigger-transform-form.tsx` | Client component — per-article transform list, receives `adminKey` as prop |
| `src/features/admin/services/scraper-dashboard.ts` | `getScraperDashboardData()` — all DB reads for the page |

## Server Page + Client Panel Pattern

The page is a server component that fetches all data and passes it as props to a single client component (`AdminActionsPanel`). This keeps server-side DB access in the page and client-side state (admin key, mutations) in the panel.

```tsx
// app/admin/scraper/page.tsx — server component, no "use client"
export default async function ScraperDashboardPage() {
  const { feedRows, untransformedCount, transformedCount, recentRawArticles, countsByFeed } =
    await getScraperDashboardData()

  return (
    <>
      {/* stat cards rendered server-side */}
      <AdminActionsPanel
        rawArticles={recentRawArticles}
        feedRows={feedRows}
        countsByFeed={countsByFeed}
      />
    </>
  )
}
```

Never add `"use client"` to `page.tsx` — it would break server-side DB calls.

## Shared Admin Key

`AdminActionsPanel` owns one `adminKey` state and passes it down to both action components as a prop. Neither `TriggerFetchForm` nor `TriggerTransformForm` manage their own key state.

```tsx
// admin-actions-panel.tsx
const [adminKey, setAdminKey] = useState("")
// ...
<TriggerFetchForm adminKey={adminKey} />
<TriggerTransformForm rawArticles={rawArticles} adminKey={adminKey} />
```

The shared input lives in its own card above the two-column grid so it's visually distinct.

## Scrollable Fixed-Height Cards

Both action cards are `max-h-[600px] flex flex-col`. Scrollable sections use the `flex-1 min-h-0 overflow-y-auto` trio — without `min-h-0`, flex children won't overflow correctly.

```tsx
<div className="flex max-h-[600px] flex-col rounded-xl border ... p-6">
  {/* pinned header — must be flex-none to prevent shrinking */}
  <div className="flex-none">
    <TriggerFetchForm adminKey={adminKey} />
  </div>
  {/* scrollable section */}
  <div className="mt-6 flex min-h-0 flex-1 flex-col border-t pt-6">
    <p className="flex-none ...">Section label</p>
    <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
      {/* list items */}
    </ul>
  </div>
</div>
```

Key rules:
- Pinned content needs `flex-none` (or it will shrink when the card is height-constrained)
- Scrollable container needs all three: `flex-1 min-h-0 overflow-y-auto`
- Add `pr-1` on the scroll container so the scrollbar doesn't overlap content

## Stat Counts

`getScraperDashboardData()` returns three counts shown in the stat cards:

```ts
// untransformed = raw_articles with no matching articles row
const [untransformedRow] = await db
  .select({ total: count() })
  .from(rawArticles)
  .leftJoin(articles, eq(articles.rawArticleId, rawArticles.id))
  .where(isNull(articles.id))

// transformed = articles table count
const [transformedRow] = await db.select({ total: count() }).from(articles)
```

Do not use `recentRawArticles.length` for the stat — it's capped at 20 and only used to populate the transform list.

## useMutation Pattern for Admin Actions

Both action forms use TanStack Query `useMutation`. The admin key is closed over from the prop at mutation call time — not captured at mutation creation.

```tsx
// trigger-fetch-form.tsx
const fetchFeedsMutation = useMutation<FetchFeedsResponse, Error>({
  mutationFn: () => postFetchFeeds(adminKey),  // adminKey from prop, read at call time
  onSuccess: (data) => toast.success(`...`),
  onError: (error) => toast.error(error.message),
})
```

The button disables when `!adminKey.trim()` or `isPending`. After success, a "Refresh dashboard" button triggers `window.location.reload()` to re-run the server component data fetch.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Adding `"use client"` to `page.tsx` | Keep it a server component; only `AdminActionsPanel` is a client component |
| Each form managing its own admin key state | Admin key lives only in `AdminActionsPanel`, passed as prop |
| Scrollable section not scrolling | Ensure `min-h-0` is on the flex child wrapping the scroll container |
| Pinned header shrinking/clipping | Wrap it in `<div className="flex-none">` |
| Using `recentRawArticles.length` for the "Untransformed" stat | Query an exact count with `COUNT + LEFT JOIN WHERE articles.id IS NULL` |
