import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/src/utils/cn";
import { messageText } from "@/src/features/chat/utils";

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const content = messageText(message);
  const assistantContent = content.replace(/\n{3,}/g, "\n\n").trim();

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-br-md bg-violet-700 text-white"
            : "rounded-bl-md border border-zinc-300/40 bg-white text-zinc-900",
        )}
      >
        <div
          className={cn(
            "mb-1 font-mono text-[0.6rem] font-semibold uppercase tracking-widest",
            isUser ? "text-white/80" : "text-zinc-500",
          )}
        >
          {isUser ? "You" : "Assistant"}
        </div>
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="max-w-none text-sm leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="my-1.5 list-disc pl-5 first:mt-0 last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-1.5 list-decimal pl-5 first:mt-0 last:mb-0">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="my-0.5 marker:text-zinc-500 empty:hidden">{children}</li>
                ),
                h1: ({ children }) => (
                  <h1 className="my-2 text-base font-semibold first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="my-2 text-sm font-semibold first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="my-1.5 text-sm font-medium first:mt-0">{children}</h3>
                ),
                pre: ({ children }) => (
                  <pre className="my-2 overflow-x-auto rounded-md bg-zinc-900/95 p-3 text-xs text-zinc-100">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => (
                  <code
                    className={cn(
                      "rounded bg-zinc-200/70 px-1 py-0.5 text-[0.8em] text-zinc-900",
                      className,
                    )}
                  >
                    {children}
                  </code>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-violet-500/70 underline-offset-2 hover:text-violet-700"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {assistantContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
