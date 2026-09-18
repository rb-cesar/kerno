import { z } from "zod";

// Entradas validadas na fronteira HTTP (zValidator no controller). O tipo é
// derivado do schema — uma declaração só, não duas (schema + interface).

export const sendMessageInputSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1),
  replyToId: z.string().nullable().optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

/** Edita o conteúdo de uma mensagem já enviada (só o autor pode). */
export const editMessageInputSchema = z.object({
  messageId: z.string().min(1),
  content: z.string().min(1),
});
export type EditMessageInput = z.infer<typeof editMessageInputSchema>;

export const createChannelInputSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
});
export type CreateChannelInput = z.infer<typeof createChannelInputSchema>;

/** Abre (ou recupera) a conversa privada com outro membro do workspace. */
export const openDirectInputSchema = z.object({
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
});
export type OpenDirectInput = z.infer<typeof openDirectInputSchema>;

export const sendDirectMessageInputSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1),
  replyToId: z.string().nullable().optional(),
});
export type SendDirectMessageInput = z.infer<typeof sendDirectMessageInputSchema>;

export const toggleReactionInputSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(16),
});
export type ToggleReactionInput = z.infer<typeof toggleReactionInputSchema>;
