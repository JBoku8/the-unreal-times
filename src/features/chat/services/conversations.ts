import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { conversations, messages } from "@/src/db/schema";

type ChatRole = "user" | "assistant";

export async function getActiveConversation(articleId: string, browserId: string) {
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.articleId, articleId),
        eq(conversations.browserId, browserId),
        eq(conversations.isActive, true),
      ),
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  return row ?? null;
}

export async function setActiveConversation(
  articleId: string,
  browserId: string,
  conversationId: string,
) {
  await db
    .update(conversations)
    .set({ isActive: false })
    .where(
      and(eq(conversations.articleId, articleId), eq(conversations.browserId, browserId)),
    );

  await db
    .update(conversations)
    .set({ isActive: true })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.articleId, articleId),
        eq(conversations.browserId, browserId),
      ),
    );
}

export async function createNewConversation(articleId: string, browserId: string) {
  await db
    .update(conversations)
    .set({ isActive: false })
    .where(
      and(eq(conversations.articleId, articleId), eq(conversations.browserId, browserId)),
    );

  const [inserted] = await db
    .insert(conversations)
    .values({ articleId, browserId, isActive: true })
    .returning({ id: conversations.id });

  return inserted;
}

export async function getOrCreateConversation(articleId: string, browserId: string) {
  const active = await getActiveConversation(articleId, browserId);
  if (active) return active;
  return createNewConversation(articleId, browserId);
}

export async function listConversationMessages(conversationId: string) {
  return db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      sequence: messages.sequence,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.sequence), asc(messages.createdAt));
}

export async function appendMessage(conversationId: string, role: ChatRole, content: string) {
  const [seqRow] = await db
    .select({ nextSeq: sql<number>`coalesce(max(${messages.sequence}), -1) + 1` })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));

  const [inserted] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
      sequence: seqRow?.nextSeq ?? 0,
    })
    .returning({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      sequence: messages.sequence,
      createdAt: messages.createdAt,
    });

  return inserted;
}
