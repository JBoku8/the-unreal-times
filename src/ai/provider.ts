import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/src/env";

export function resolveChatModel() {
  switch (env.AI_PROVIDER) {
    case "openai":
      return createOpenAI({
        apiKey: env.OPENAI_API_KEY,
      })(env.OPENAI_MODEL);
    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${env.AI_PROVIDER}". Supported providers: openai`,
      );
  }
}
