import { NextResponse } from "next/server";
import { createNewConversation } from "@/src/features/chat/services/conversations";

export async function POST(
  req: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await context.params;

  let browserId = "";
  try {
    const body = await req.json();
    browserId = typeof body?.browserId === "string" ? body.browserId.trim() : "";
  } catch {
    browserId = "";
  }

  if (browserId.length < 8 || browserId.length > 128) {
    return NextResponse.json({ error: "browserId is required" }, { status: 400 });
  }

  const created = await createNewConversation(articleId, browserId);
  return NextResponse.json({ conversationId: created.id });
}
