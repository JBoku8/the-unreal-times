type ArticleContextPromptInput = {
  title: string;
  url: string;
  transformedContent: string;
  originalContent: string;
};

type TransformPromptInput = {
  title: string;
  rawContent: string;
};

export const CHAT_QUICK_PROMPTS = [
  "Summarize this article",
  "What are the key entities mentioned? (people, companies, locations)",
  "How was the original article changed?",
] as const;

export function buildArticleChatSystemPrompt({
  title,
  url,
  transformedContent,
  originalContent,
}: ArticleContextPromptInput): string {
  return [
    "You are a helpful assistant that answers only from the provided article context.",
    "You can handle structured requests: summarize, extract key entities (people/companies/locations), and compare transformed article vs original source.",
    "When formatting responses in Markdown, keep layout compact: avoid empty bullet points, avoid unnecessary nested lists, and do not add extra blank lines between list items.",
    `Article title: ${title}`,
    `Article source: ${url}`,
    `Transformed article content: ${transformedContent}`,
    `Original source content: ${originalContent}`,
    "If something is not in the article, say you do not see it in the article.",
  ].join("\n");
}

export const SATIRICAL_TRANSFORM_SYSTEM_PROMPT =
  'You are a satirical editor. Rewrite the given article title and content into a clearly fictional and satirical version: humorous, absurd, and intentionally fabricated while keeping the original core subject recognizable. Do not present it as factual reporting. Return ONLY valid JSON with "title" and "content" string keys. No markdown fences, no explanation, just the JSON object.';

export function buildSatiricalTransformUserPrompt({
  title,
  rawContent,
}: TransformPromptInput): string {
  return `Title: ${title}\n\nContent: ${rawContent}`;
}
