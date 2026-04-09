import { MessageCircle } from "lucide-react";
import { CHAT_QUICK_PROMPTS } from "@/src/ai/prompts";

export function ChatEmptyState({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300/50 bg-zinc-100/50 px-4 py-10 text-center">
      <MessageCircle className="h-8 w-8 text-violet-700" aria-hidden />
      <p className="max-w-xs text-sm text-zinc-600">
        Ask pointed questions—answers should stick to what&apos;s in the article.
      </p>
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-violet-700">
        Satire-safe RAG
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {CHAT_QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:border-violet-400 hover:text-violet-700"
            onClick={() => onSelectPrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
