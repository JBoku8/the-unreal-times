import { generateText } from "ai";
import { resolveChatModel } from "@/src/ai/provider";
import {
  buildSatiricalTransformUserPrompt,
  SATIRICAL_TRANSFORM_SYSTEM_PROMPT,
} from "@/src/ai/prompts";

export async function generateHumorousTransform(
  title: string,
  rawContent: string,
): Promise<{ title: string; content: string }> {
  const { text } = await generateText({
    model: resolveChatModel(),
    system: SATIRICAL_TRANSFORM_SYSTEM_PROMPT,
    prompt: buildSatiricalTransformUserPrompt({ title, rawContent }),
    maxOutputTokens: 1024,
    abortSignal: AbortSignal.timeout(30_000),
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`LLM returned non-JSON: ${text.slice(0, 200)}`);
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).title !== "string" ||
    typeof (parsed as Record<string, unknown>).content !== "string"
  ) {
    throw new Error(`LLM JSON missing title or content keys: ${text.slice(0, 200)}`);
  }

  const result = parsed as { title: string; content: string };
  return { title: result.title, content: result.content };
}
