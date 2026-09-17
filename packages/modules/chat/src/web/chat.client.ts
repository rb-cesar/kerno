"use client";

import { request } from "@kerno/core/client";
import type { ChannelDTO, ChatResult, DirectConversationDTO, MessageDTO } from "../types";

// Chamadas HTTP do módulo Chat — mesma origem (/api/chat/...), sem BFF.

function chatError(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" };
}

export const chatClient = {
  fetchMessages: (channelId: string): Promise<MessageDTO[]> =>
    request<MessageDTO[]>(`/chat/channels/${channelId}/messages`).catch(() => []),

  sendMessage: (input: {
    channelId: string;
    content: string;
    replyToId?: string | null;
  }): Promise<ChatResult<MessageDTO>> =>
    request<ChatResult<MessageDTO>>(`/chat/messages`, { method: "POST", body: input }).catch(
      chatError,
    ),

  editMessage: (input: { messageId: string; content: string }): Promise<ChatResult<MessageDTO>> =>
    request<ChatResult<MessageDTO>>(`/chat/messages/edit`, { method: "POST", body: input }).catch(
      chatError,
    ),

  createChannel: (input: { workspaceId: string; name: string }): Promise<ChatResult<ChannelDTO>> =>
    request<ChatResult<ChannelDTO>>(`/chat/channels`, { method: "POST", body: input }).catch(
      chatError,
    ),

  // ── Mensagens diretas (DM) ─────────────────────────────────────────────────

  openDirect: (input: {
    workspaceId: string;
    userId: string;
  }): Promise<ChatResult<DirectConversationDTO>> =>
    request<ChatResult<DirectConversationDTO>>(`/chat/direct`, {
      method: "POST",
      body: input,
    }).catch(chatError),

  fetchDirectMessages: (conversationId: string): Promise<MessageDTO[]> =>
    request<MessageDTO[]>(`/chat/direct/${conversationId}/messages`).catch(() => []),

  toggleReaction: (input: {
    messageId: string;
    emoji: string;
  }): Promise<ChatResult<{ messageId: string }>> =>
    request<ChatResult<{ messageId: string }>>(`/chat/reactions`, {
      method: "POST",
      body: input,
    }).catch(chatError),

  sendDirectMessage: (input: {
    conversationId: string;
    content: string;
    replyToId?: string | null;
  }): Promise<ChatResult<MessageDTO>> =>
    request<ChatResult<MessageDTO>>(`/chat/direct/messages`, {
      method: "POST",
      body: input,
    }).catch(chatError),
};
