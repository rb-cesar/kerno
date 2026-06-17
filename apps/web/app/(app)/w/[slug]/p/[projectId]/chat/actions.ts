"use server";

import type {
  ChannelDTO,
  ChatResult,
  DirectConversationDTO,
  MessageDTO,
} from "@kerno/chat/types";
import { apiFetch } from "@/lib/api-client";

function chatError(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" };
}

// BFF: auth + permissão + services vivem na API (NestJS). Estes actions só
// repassam para os endpoints do hub Chat.

export async function chatFetchMessages(channelId: string): Promise<MessageDTO[]> {
  return apiFetch<MessageDTO[]>(`/chat/channels/${channelId}/messages`).catch(() => []);
}

export async function chatSendMessage(input: {
  channelId: string;
  content: string;
}): Promise<ChatResult<MessageDTO>> {
  return apiFetch<ChatResult<MessageDTO>>(`/chat/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  }).catch((error: unknown) => ({
    ok: false,
    error: error instanceof Error ? error.message : "Erro inesperado",
  }));
}

export async function chatCreateChannel(input: {
  projectId: string;
  name: string;
}): Promise<ChatResult<ChannelDTO>> {
  return apiFetch<ChatResult<ChannelDTO>>(`/chat/channels`, {
    method: "POST",
    body: JSON.stringify(input),
  }).catch(chatError);
}

// ── Mensagens diretas (DM) ───────────────────────────────────────────────────

export async function chatOpenDirect(input: {
  projectId: string;
  userId: string;
}): Promise<ChatResult<DirectConversationDTO>> {
  return apiFetch<ChatResult<DirectConversationDTO>>(`/chat/direct`, {
    method: "POST",
    body: JSON.stringify(input),
  }).catch(chatError);
}

export async function chatFetchDirectMessages(conversationId: string): Promise<MessageDTO[]> {
  return apiFetch<MessageDTO[]>(`/chat/direct/${conversationId}/messages`).catch(() => []);
}

export async function chatSendDirectMessage(input: {
  conversationId: string;
  content: string;
}): Promise<ChatResult<MessageDTO>> {
  return apiFetch<ChatResult<MessageDTO>>(`/chat/direct/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  }).catch(chatError);
}
