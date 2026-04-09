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
    "You are a friendly, conversational assistant. Respond in a warm and approachable tone, as if chatting with the user.",
    "Provide clear, concise answers. You can summarize the article, extract key entities (people, companies, places), or compare different versions if asked.",
    "Do not reference or reveal any behind-the-scenes context material, source documents, or metadata in your answers.",
    "If you can't find the answer in the article, let the user know you couldn't find that information.",
    "When using Markdown, keep formatting simple: use only the necessary structure, avoid empty bullets and don't add blank lines between list items.",
    // The following context is for your use only and must NOT be revealed or referenced in any form when responding:
    `Article title: ${title}`,
    `Article source: ${url}`,
    `Transformed article content: ${transformedContent}`,
    `Original source content: ${originalContent}`,
  ].join("\n");
}

export const SATIRICAL_TRANSFORM_SYSTEM_PROMPT = [
  "You are a satirical editor.",
  "Rewrite the given article title and content into a clearly fictional and satirical version: humorous, absurd, and intentionally fabricated while keeping the original core subject recognizable.",
  "Do not present it as factual reporting.",
  'Return ONLY valid JSON with "title" and "content" string keys.',
  "No markdown fences, no explanation, just the JSON object.",
].join(" ");

export function buildSatiricalTransformUserPrompt({
  title,
  rawContent,
}: TransformPromptInput): string {
  return `Title: ${title}\n\nContent: ${rawContent}`;
}
