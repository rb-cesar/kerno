// Contratos do Hub Chat — DTOs (dados) + envelopes de resultado.
// Pacote puro: sem Next, Prisma ou React. Consumível por qualquer app cliente.

import type { MemberDTO } from "./common";

export type { MemberDTO };

export interface ChannelDTO {
  id: string;
  name: string;
  isDefault: boolean;
}

/** Resumo da mensagem citada ao responder. */
export interface MessageReplyDTO {
  id: string;
  authorName: string;
  excerpt: string;
}

export interface MessageDTO {
  id: string;
  content: string;
  createdAt: string; // ISO
  isSystem: boolean;
  author: MemberDTO | null;
  replyTo: MessageReplyDTO | null;
}

/** Conversa privada (DM) entre membros de um mesmo projeto. */
export interface DirectConversationDTO {
  id: string;
  /** Outros participantes além do usuário atual (no 1:1, um único membro). */
  participants: MemberDTO[];
  lastMessageAt: string | null; // ISO — para ordenar por atividade
}

export interface ChatData {
  projectId: string;
  channels: ChannelDTO[];
  conversations: DirectConversationDTO[];
  members: MemberDTO[];
  initialChannelId: string | null;
  initialMessages: MessageDTO[];
}

export type ChatResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface SendMessageInput {
  channelId: string;
  content: string;
  replyToId?: string | null;
}

export interface CreateChannelInput {
  projectId: string;
  name: string;
}

/** Abre (ou recupera) a conversa privada com outro membro do projeto. */
export interface OpenDirectInput {
  projectId: string;
  userId: string;
}

export interface SendDirectMessageInput {
  conversationId: string;
  content: string;
  replyToId?: string | null;
}
