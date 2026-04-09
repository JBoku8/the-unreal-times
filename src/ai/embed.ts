import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/src/env";

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
    abortSignal: AbortSignal.timeout(30_000),
  });
  return embedding;
}
