"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/utils/cn";
import { useChatSession } from "@/src/features/chat/hooks/use-chat-session";
import { MessageBubble } from "./message-bubble";
import { ChatEmptyState } from "./chat-empty-state";

type ChatPanelProps = {
  articleId: string;
  articleTitle: string;
  /** When false, omit outer glass shell (e.g. already inside a styled aside). */
  framed?: boolean;
};

export function ChatPanel({ articleId, articleTitle, framed = true }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const {
    browserId,
    messages,
    sendMessage,
    isLoading,
    error,
    historyLoading,
    historyQueryError,
    newConversationMutation,
  } = useChatSession(articleId);

  const canSend = input.trim().length > 0 && !isLoading && browserId.length >= 8;
  const helperText = error
    ? "Request failed. Update your message and try again."
    : isLoading
      ? "Assistant is responding..."
      : "Enter to send · Shift+Enter for newline";

  const send = async () => {
    if (!canSend) return;
    const content = input.trim();
    setInput("");
    await sendMessage({ text: content });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  const shellClass = framed
    ? "rounded-2xl border border-white/40 bg-white/55 shadow-[0_24px_60px_-20px_rgba(9,20,38,0.35)] backdrop-blur-xl"
    : "rounded-2xl border border-zinc-300/40 bg-white/90 shadow-inner backdrop-blur-md";

  return (
    <div className={cn("flex h-[640px] flex-col overflow-hidden", shellClass)}>
      <div className="border-b border-zinc-300/40 bg-linear-to-r from-slate-800/95 to-violet-700/85 px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/80">
              Unreal assistant
            </p>
            <h2 className="font-display mt-1 text-lg font-semibold leading-snug">
              Chat in context
            </h2>
            <p className="mt-1 line-clamp-2 text-xs text-white/85">{articleTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => newConversationMutation.mutate()}
              disabled={!browserId || isLoading || newConversationMutation.isPending}
              className="h-10 cursor-pointer rounded-xl border border-white/25 bg-white/18 px-4 font-semibold text-white shadow-sm backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/28 hover:shadow-md focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              New
            </Button>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-white" aria-hidden />
            </span>
          </div>
        </div>
      </div>

      <div
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {historyLoading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-violet-700" aria-hidden />
            Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <ChatEmptyState onSelectPrompt={setInput} />
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-violet-700" aria-hidden />
            Composing a careful reply…
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="border-t border-zinc-300/40 bg-zinc-100/50 p-4">
        <label className="sr-only" htmlFor={`chat-input-${articleId}`}>
          Message about this article
        </label>
        <textarea
          id={`chat-input-${articleId}`}
          value={input}
          disabled={isLoading}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="What does this piece claim about…?"
          rows={3}
          className="w-full resize-none rounded-t-md border-0 border-b-2 border-zinc-300 bg-transparent px-0 py-2 text-sm text-zinc-900 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-500 focus:border-violet-700 focus:ring-0"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={cn("text-xs", error ? "text-red-700" : "text-zinc-500")}>
            {helperText}
          </span>
          <Button
            type="submit"
            variant="satireAccent"
            disabled={!canSend}
            className="inline-flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="h-4 w-4" aria-hidden />
            )}
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
        {error || historyQueryError || newConversationMutation.error ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {historyQueryError?.message ||
              newConversationMutation.error?.message ||
              error?.message ||
              "Chat request failed. Please try again."}
          </p>
        ) : null}
      </form>
    </div>
  );
}
