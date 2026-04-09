export function buildPageHref(
  base: string,
  currentParams: Record<string, string | string[] | undefined>,
  targetPage: number,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(currentParams)) {
    if (!value) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v) params.append(key, v);
    }
  }

  if (targetPage <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(targetPage));
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parsePage(raw: string | undefined): number {
  return Math.max(1, parseInt(raw ?? "1", 10) || 1);
}
