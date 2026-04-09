import { NextResponse } from "next/server";
import { listConversationMessages, getOrCreateConversation } from "@/src/features/chat/services/conversations";

export async function GET(
  req: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await context.params;
  const url = new URL(req.url);
  const browserId = url.searchParams.get("browserId")?.trim() ?? "";

  if (browserId.length < 8 || browserId.length > 128) {
    return NextResponse.json({ error: "browserId is required" }, { status: 400 });
  }

  const conversation = await getOrCreateConversation(articleId, browserId);
  const rows = await listConversationMessages(conversation.id);

  return NextResponse.json({
    conversationId: conversation.id,
    messages: rows,
  });
}
