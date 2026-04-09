import { z } from "zod";

export const uiMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
      }),
    )
    .optional(),
  content: z.string().optional(),
});

export const chatRequestSchema = z.object({
  browserId: z.string().min(8).max(128).optional(),
  conversationId: z.string().uuid().optional(),
  messages: z.array(uiMessageSchema).min(1),
});

export const chatQuerySchema = z.object({
  browserId: z.string().min(8).max(128).optional(),
  conversationId: z.string().uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
