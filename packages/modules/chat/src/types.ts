// Contratos do Hub Chat. Os DTOs e envelopes vivem em @kerno/contracts (pacote
// puro, compartilhável com apps cliente). Aqui ficam só os tipos de wiring da
// camada de entrega (as server actions injetadas pelo app).

export * from "@kerno/contracts/chat";

import type {
  ChannelDTO,
  DirectConversationDTO,
  MessageDTO,
  ChatResult,
} from "@kerno/contracts/chat";

/** Server actions injetadas pelo app no componente do hub. */
export type ChatSendMessage = (input: {
  channelId: string;
  content: string;
  replyToId?: string | null;
}) => Promise<ChatResult<MessageDTO>>;

export type ChatCreateChannel = (input: {
  projectId: string;
  name: string;
}) => Promise<ChatResult<ChannelDTO>>;

export type ChatFetchMessages = (channelId: string) => Promise<MessageDTO[]>;

// ── Mensagens diretas (DM) ──────────────────────────────────────────────────

export type ChatOpenDirect = (input: {
  projectId: string;
  userId: string;
}) => Promise<ChatResult<DirectConversationDTO>>;

export type ChatSendDirectMessage = (input: {
  conversationId: string;
  content: string;
  replyToId?: string | null;
}) => Promise<ChatResult<MessageDTO>>;

export type ChatFetchDirectMessages = (conversationId: string) => Promise<MessageDTO[]>;

export type ChatToggleReaction = (input: {
  messageId: string;
  emoji: string;
}) => Promise<ChatResult<{ messageId: string }>>;
