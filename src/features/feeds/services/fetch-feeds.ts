import Parser from "rss-parser";
import sanitizeHtml from "sanitize-html";

type ParsedArticle = {
  feedTitle: string;
  feedDescription?: string;
  feedUrl: string;
  sourceName: string;
  title: string;
  content: string;
  url: string;
  thumbnailUrl?: string;
  publishedAt?: Date;
};

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: true }],
      ["content:encoded", "content:encoded"],
    ],
  },
});

function stripHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
}

const TRAILING_CONTENT_NOISE_PATTERNS = [
  "continue reading",
  "read more",
  "read the full article",
  "click here to read more",
  "view original post",
];

function stripTrailingContentNoise(value: string): string {
  let result = value.trim();
  let didStrip = false;

  do {
    didStrip = false;

    for (const pattern of TRAILING_CONTENT_NOISE_PATTERNS) {
      const suffixRegex = new RegExp(
        `(?:\\s|[-:|])*(?:${pattern})(?:\\s*[.!…]*)$`,
        "i",
      );

      if (suffixRegex.test(result)) {
        result = result.replace(suffixRegex, "").trim();
        didStrip = true;
      }
    }
  } while (didStrip);

  return result;
}

function pickFirstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickFirstImageUrl(values: unknown[]): string | undefined {
  for (const value of values) {
    if (!value) continue;

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "object") {
      const candidate = value as Record<string, unknown>;
      const fromCommonKeys = pickFirstString([
        candidate.url,
        candidate.href,
        candidate.src,
      ]);
      if (fromCommonKeys) return fromCommonKeys;
    }
  }
  return undefined;
}

function resolveThumbnailUrl(item: Record<string, unknown>): string | undefined {
  const extractFirstImgSrcFromHtml = (html: string): string | undefined => {
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1]?.trim() || undefined;
  };

  const enclosure = item.enclosure as Record<string, unknown> | undefined;
  const enclosureUrl =
    enclosure && typeof enclosure.type === "string" && enclosure.type.includes("image")
      ? pickFirstString([enclosure.url])
      : undefined;

  const mediaContent = item["media:content"] as
    | Record<string, unknown>
    | Array<Record<string, unknown>>
    | undefined;
  const mediaContentUrl = Array.isArray(mediaContent)
    ? mediaContent
        .map((entry) =>
          pickFirstString([entry.url, entry.href, entry.src]),
        )
        .find((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : mediaContent
      ? pickFirstString([mediaContent.url, mediaContent.href, mediaContent.src])
      : undefined;

  const encodedContent = pickFirstString([
    item["content:encoded"],
    item.content,
    item["content:encodedSnippet"],
  ]);
  const encodedImageUrl = encodedContent ? extractFirstImgSrcFromHtml(encodedContent) : undefined;

  const itunesImage = item["itunes:image"] as Record<string, unknown> | undefined;

  return pickFirstImageUrl([
    item.isoImage,
    item.image,
    mediaContentUrl,
    encodedImageUrl,
    itunesImage?.href,
    enclosureUrl,
  ]);
}

export async function fetchFeeds(urls: string[]): Promise<ParsedArticle[]> {
  const allArticles: ParsedArticle[] = [];

  for (const url of urls) {
    const feed = await parser.parseURL(url);
    const feedTitle = feed.title ?? url;
    const feedDescription = stripHtml(feed.description ?? "");

    for (const item of feed.items) {
      const title = item.title ?? "Untitled";
      const contentSource = item.contentSnippet ?? item.content ?? "";
      const content = stripTrailingContentNoise(stripHtml(contentSource));
      const articleUrl = item.link ?? "";
      if (!articleUrl) continue;
      const thumbnailUrl = resolveThumbnailUrl(item as unknown as Record<string, unknown>);

      allArticles.push({
        feedTitle,
        feedDescription,
        feedUrl: url,
        sourceName: feedTitle,
        title,
        content,
        url: articleUrl,
        thumbnailUrl,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
    }
  }

  return allArticles;
}
