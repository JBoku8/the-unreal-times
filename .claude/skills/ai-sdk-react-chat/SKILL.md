---
name: ai-sdk-react-chat
description: Use when building or modifying client-side chat UI components. Covers useChat hook from @ai-sdk/react v3, DefaultChatTransport, sendMessage API, status checking, and extracting text from UIMessage parts.
---

# AI SDK React — Client Chat UI

## Key Imports

```ts
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
```

`useChat` lives in `@ai-sdk/react`, but `DefaultChatTransport` and `UIMessage` come from the core `"ai"` package.

## useChat Setup (v6 Pattern)

```ts
// Transport must be memoized — recreating it on every render resets the chat
const transport = useMemo(
  () => new DefaultChatTransport({ api: `/api/chat/${articleId}` }),
  [articleId],
)

const { messages, sendMessage, status, error } = useChat({ transport })
```

Do NOT use the old `useChat({ api: "..." })` shorthand — in v6, pass a `transport` object.

## Sending Messages

```ts
// v6: sendMessage, not append
await sendMessage({ text: content })
```

The old `append({ role: "user", content })` API is gone in v6.

## Status Values

```ts
const isLoading = status === "submitted" || status === "streaming"
// "idle" | "submitted" | "streaming" | "error"
```

Show a spinner when `isLoading` is true. Do not treat `"submitted"` as complete.

## UX Conventions for ChatPanel

Reference implementation: `components/chat/chat-panel.tsx`.

- Disable message input while `isLoading` to prevent conflicting edits during stream.
- Keep the submit button stateful (`Send` vs `Sending...`) with a spinner.
- Show contextual helper text:
  - default keyboard hint when idle
  - active response hint while loading
  - clear retry guidance when `error` is present

This keeps chat request handling aligned with the rest of the app's declarative loading/error UX.

## Extracting Text from UIMessage

In v6, message content lives in `parts`, not directly on `message.content`:

```ts
function messageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter(part => part.type === "text")
      .map(part => ("text" in part ? part.text : ""))
      .join("") ?? ""
  )
}
```

Do not read `message.content` — it may be undefined for streamed messages.

## ChatPanel Component

Reference implementation: `components/chat/chat-panel.tsx`

```tsx
<ChatPanel articleId={article.id} articleTitle={article.title} framed />
```

Props:
- `articleId` — used to construct the transport API URL
- `articleTitle` — displayed in the panel header
- `framed?: boolean` — toggles outer glass-card styling (default `true`)

## Enter-to-Send Pattern

```ts
onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    void send()
  }
}}
```

Shift+Enter inserts a newline; plain Enter submits.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `useChat({ api: "/api/chat/..." })` | Use `useChat({ transport: new DefaultChatTransport({ api }) })` |
| `append({ role, content })` | Use `sendMessage({ text: content })` |
| Reading `message.content` for display | Extract text from `message.parts` |
| Creating transport inline without `useMemo` | Memoize by `articleId` to prevent reset on re-render |
| Leaving input interactive during streaming | Disable textarea while `status` is `"submitted"` or `"streaming"` |
