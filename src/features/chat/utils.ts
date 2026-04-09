import type { UIMessage } from "ai";

export function messageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("") ?? ""
  );
}
