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
/**
 * Referência de tarefa para a menção `!` no chat. Tipo LOCAL do chat (não importa
 * nada do kanban) — o app injeta `searchTasks`, cujo retorno é estruturalmente
 * compatível. Mantém o hub Chat sem conhecimento do hub Kanban.
 */
export interface TaskRef {
  id: string;
  number: number;
  title: string;
  workspaceKey: string;
}

/** Busca tarefas do workspace p/ o typeahead `!` (injetada pelo app, opcional). */
export type ChatSearchTasks = (query: string) => Promise<TaskRef[]>;

/** Server actions injetadas pelo app no componente do hub. */
export type ChatSendMessage = (input: {
  channelId: string;
  content: string;
  replyToId?: string | null;
}) => Promise<ChatResult<MessageDTO>>;

export type ChatEditMessage = (input: {
  messageId: string;
  content: string;
}) => Promise<ChatResult<MessageDTO>>;

export type ChatCreateChannel = (input: {
  workspaceId: string;
  name: string;
}) => Promise<ChatResult<ChannelDTO>>;

export type ChatFetchMessages = (channelId: string) => Promise<MessageDTO[]>;

// ── Mensagens diretas (DM) ──────────────────────────────────────────────────

export type ChatOpenDirect = (input: {
  workspaceId: string;
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
