import { NextResponse } from "next/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { articles, conversations, rawArticles } from "@/src/db/schema";
import type { ArticleRow, RawArticleRow } from "@/src/db/types";
import { resolveChatModel } from "@/src/ai/provider";
import { buildArticleChatSystemPrompt } from "@/src/ai/prompts";
import {
  chatQuerySchema,
  chatRequestSchema,
} from "@/src/features/chat/validation/chat-request";
import {
  appendMessage,
  getOrCreateConversation,
  setActiveConversation,
} from "@/src/features/chat/services/conversations";

export const maxDuration = 30;

type ChatArticleContextRow = Pick<ArticleRow, "id" | "title" | "content"> &
  Pick<RawArticleRow, "url" | "rawContent">;

function messageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("") ?? ""
  );
}

export async function POST(
  req: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await context.params;
  const url = new URL(req.url);
  const payload = await req.json();
  const parsed = chatRequestSchema.safeParse(payload);
  const parsedQuery = chatQuerySchema.safeParse({
    browserId: url.searchParams.get("browserId")?.trim() || undefined,
    conversationId: url.searchParams.get("conversationId")?.trim() || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid chat payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid chat query", details: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      content: articles.content,
      url: rawArticles.url,
      rawContent: rawArticles.rawContent,
    })
    .from(articles)
    .innerJoin(rawArticles, eq(articles.rawArticleId, rawArticles.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  const article: ChatArticleContextRow | null = rows[0] ?? null;

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const browserId = parsedQuery.data.browserId || parsed.data.browserId || "";
  if (!browserId) {
    return NextResponse.json({ error: "browserId is required" }, { status: 400 });
  }
  const requestedConversationId =
    parsedQuery.data.conversationId || parsed.data.conversationId;

  let conversationId: string;
  if (requestedConversationId) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, requestedConversationId),
          eq(conversations.articleId, articleId),
          eq(conversations.browserId, browserId),
        ),
      )
      .limit(1);

    if (existing) {
      conversationId = existing.id;
      await setActiveConversation(articleId, browserId, conversationId);
    } else {
      const created = await getOrCreateConversation(articleId, browserId);
      conversationId = created.id;
    }
  } else {
    const created = await getOrCreateConversation(articleId, browserId);
    conversationId = created.id;
  }

  const uiMessages = parsed.data.messages as UIMessage[];
  const latestUserMessage = [...uiMessages].reverse().find((msg) => msg.role === "user");
  const latestUserText = latestUserMessage ? messageText(latestUserMessage).trim() : "";
  if (latestUserText.length > 0) {
    await appendMessage(conversationId, "user", latestUserText);
  }

  const modelMessages = await convertToModelMessages(
    uiMessages.map(
      (message) =>
        Object.fromEntries(
          Object.entries(message).filter(([key]) => key !== "id"),
        ) as Omit<UIMessage, "id">,
    ),
  );

  const result = streamText({
    model: resolveChatModel(),
    onFinish: async ({ text }) => {
      const assistantText = text.trim();
      if (assistantText.length > 0) {
        await appendMessage(conversationId, "assistant", assistantText);
      }
    },
    system: buildArticleChatSystemPrompt({
      title: article.title,
      url: article.url,
      transformedContent: article.content,
      originalContent: article.rawContent,
    }),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
