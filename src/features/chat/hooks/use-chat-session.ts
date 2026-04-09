"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

type ChatHistoryPayload = {
  conversationId: string;
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
};

async function fetchChatHistory(articleId: string, browserId: string): Promise<ChatHistoryPayload> {
  const res = await fetch(
    `/api/chat/${articleId}/history?browserId=${encodeURIComponent(browserId)}`,
  );
  if (!res.ok) throw new Error("Failed to load chat history");
  return res.json() as Promise<ChatHistoryPayload>;
}

async function postNewConversation(
  articleId: string,
  browserId: string,
): Promise<{ conversationId: string }> {
  const res = await fetch(`/api/chat/${articleId}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ browserId }),
  });
  if (!res.ok) throw new Error("Failed to create new conversation");
  return res.json() as Promise<{ conversationId: string }>;
}

export function useChatSession(articleId: string) {
  const [browserId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const key = "unreal:browser-id";
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    const generated = crypto.randomUUID();
    window.localStorage.setItem(key, generated);
    return generated;
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/${articleId}`,
        prepareSendMessagesRequest: ({ id, messages, trigger, messageId, body, headers, credentials }) => {
          const params = new URLSearchParams();
          params.set("browserId", browserId);
          if (conversationId) {
            params.set("conversationId", conversationId);
          }
          return {
            api: `/api/chat/${articleId}?${params.toString()}`,
            body: { ...body, id, messages, trigger, messageId },
            headers,
            credentials,
          };
        },
      }),
    [articleId, browserId, conversationId],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({ transport });

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyQueryError,
  } = useQuery({
    queryKey: ["chatHistory", articleId, browserId],
    queryFn: () => fetchChatHistory(articleId, browserId),
    enabled: !!browserId,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!historyData || isLoading) return;
    startTransition(() => {
      setConversationId(historyData.conversationId);
      setMessages(
        historyData.messages.map((message) => ({
          id: message.id,
          role: message.role,
          parts: [{ type: "text", text: message.content }],
        })),
      );
    });
  }, [historyData, isLoading, setMessages]);

  const newConversationMutation = useMutation({
    mutationFn: () => postNewConversation(articleId, browserId),
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages([]);
      void queryClient.invalidateQueries({ queryKey: ["chatHistory", articleId, browserId] });
    },
  });

  return {
    browserId,
    messages,
    sendMessage,
    isLoading,
    error,
    historyLoading,
    historyQueryError,
    newConversationMutation,
  };
}
