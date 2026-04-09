---
name: vercel-ai-sdk-v6-streaming
description: Use when building or modifying server-side streaming chat route handlers. Covers Vercel AI SDK v6 breaking changes from v3 — convertToModelMessages, UIMessage type, toUIMessageStreamResponse, and the resolveChatModel provider abstraction.
---

# Vercel AI SDK v6 — Server Streaming

## Versions in This Codebase

```json
"ai": "^6.0.147",
"@ai-sdk/openai": "^3.0.51",
"@ai-sdk/react": "^3.0.149"
```

**v6 is a breaking change from v3.** Training data about AI SDK is mostly v3. Read this before touching chat routes.

## The Chat Route Pattern

Full working example — `app/api/chat/[articleId]/route.ts`:

```ts
import { convertToModelMessages, streamText, type UIMessage } from "ai"

export const maxDuration = 30   // required for Vercel streaming timeout

export async function POST(req: Request, context: { params: Promise<{ articleId: string }> }) {
  const { articleId } = await context.params   // params is a Promise in Next.js 16

  const payload = await req.json()
  const parsed = chatRequestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }

  // v6: convert UIMessage[] → model-compatible messages
  const uiMessages = parsed.data.messages as UIMessage[]
  const modelMessages = await convertToModelMessages(
    uiMessages.map(msg => Object.fromEntries(Object.entries(msg).filter(([k]) => k !== "id")))
  )

  const result = streamText({
    model: resolveChatModel(),
    system: "...",
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()  // v6 method, NOT toDataStreamResponse()
}
```

## v6 vs v3 Breaking Changes

| v3 | v6 |
|----|-----|
| `CoreMessage` | `UIMessage` |
| `streamText().toDataStreamResponse()` | `streamText().toUIMessageStreamResponse()` |
| Messages passed directly | Must run through `convertToModelMessages()` first |
| `import { Message } from "ai"` | `import { UIMessage } from "ai"` |

## Provider Abstraction

```ts
// src/ai/provider.ts
import { createOpenAI } from "@ai-sdk/openai"

export function resolveChatModel() {
  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase()
  const modelName = process.env.OPENAI_MODEL ?? "gpt-4o"
  switch (provider) {
    case "openai": return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelName)
    default: throw new Error(`Unsupported AI_PROVIDER "${provider}"`)
  }
}
```

Always call `resolveChatModel()` — do not instantiate providers inline in route files.

## Validation Schema (Zod v4)

```ts
// src/validation/chat.ts — UIMessage shape for v6
export const uiMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  content: z.string().optional(),
})
export const chatRequestSchema = z.object({ messages: z.array(uiMessageSchema).min(1) })
```

Note: Zod v4 (`zod@^4`) — `z.object`, `z.enum` work the same, but some v3 helpers differ.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `toDataStreamResponse()` | Use `toUIMessageStreamResponse()` in v6 |
| Passing `UIMessage[]` directly to `streamText` | Always convert with `convertToModelMessages()` first |
| Importing `CoreMessage` | Use `UIMessage` from `"ai"` in v6 |
| Instantiating model in route file | Always use `resolveChatModel()` |
