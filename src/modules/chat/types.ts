// Contratos do Hub Chat — DTOs (dados), envelopes de resultado e os tipos de
// wiring da camada de entrega (as server actions/clients injetados pelo app).

export type { MemberDTO } from "@/core/types";

import type { MemberDTO } from "@/core/types";

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

/** Reações agregadas por emoji numa mensagem. */
export interface ReactionDTO {
  emoji: string;
  count: number;
  mine: boolean; // o usuário atual reagiu com este emoji
}

export interface MessageDTO {
  id: string;
  content: string;
  createdAt: string; // ISO
  editedAt: string | null; // ISO — preenchido só se a mensagem foi editada
  isSystem: boolean;
  author: MemberDTO | null;
  replyTo: MessageReplyDTO | null;
  reactions: ReactionDTO[];
}

/** Conversa privada (DM) entre membros de um mesmo workspace. */
export interface DirectConversationDTO {
  id: string;
  /** Outros participantes além do usuário atual (no 1:1, um único membro). */
  participants: MemberDTO[];
  lastMessageAt: string | null; // ISO — para ordenar por atividade
}

export interface ChatData {
  workspaceId: string;
  channels: ChannelDTO[];
  conversations: DirectConversationDTO[];
  members: MemberDTO[];
  initialChannelId: string | null;
  initialMessages: MessageDTO[];
}

export type ChatResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Entradas (validadas por zod na fronteira HTTP — ver ./chat.dto, cujo schema
// só o controller usa) — o tipo é reexportado aqui porque o client do chat
// (web) também precisa da forma do body que envia.
export type {
  CreateChannelInput,
  EditMessageInput,
  OpenDirectInput,
  SendDirectMessageInput,
  SendMessageInput,
  ToggleReactionInput,
} from "./dto";

import type {
  CreateChannelInput,
  EditMessageInput,
  OpenDirectInput,
  SendDirectMessageInput,
  SendMessageInput,
  ToggleReactionInput,
} from "./dto";

// ── Referência de tarefa (menção `!` no chat) ─────────────────────────────────
// O tipo mora em `@/components/editor` (dono do plugin de typeahead `!`), importado
// do subpath `/types` — puro, sem JSX, para não obrigar quem só usa o tipo
// (ex.: o backend) a resolver os componentes React do editor. O app injeta
// `searchTasks`, cujo retorno é estruturalmente compatível. Mantém o hub Chat
// sem conhecimento do hub Kanban.
export type { TaskRef } from "@/components/editor/types";

import type { TaskRef } from "@/components/editor/types";

/** Busca tarefas do workspace p/ o typeahead `!` (injetada pelo app, opcional). */
export type ChatSearchTasks = (query: string) => Promise<TaskRef[]>;

// ── Wiring da camada de entrega (server actions/clients injetados pelo app) ──

export type ChatSendMessage = (input: SendMessageInput) => Promise<ChatResult<MessageDTO>>;
export type ChatEditMessage = (input: EditMessageInput) => Promise<ChatResult<MessageDTO>>;
export type ChatCreateChannel = (input: CreateChannelInput) => Promise<ChatResult<ChannelDTO>>;
export type ChatFetchMessages = (channelId: string) => Promise<MessageDTO[]>;

// ── Mensagens diretas (DM) ──────────────────────────────────────────────────

export type ChatOpenDirect = (input: OpenDirectInput) => Promise<ChatResult<DirectConversationDTO>>;
export type ChatSendDirectMessage = (
  input: SendDirectMessageInput,
) => Promise<ChatResult<MessageDTO>>;
export type ChatFetchDirectMessages = (conversationId: string) => Promise<MessageDTO[]>;
export type ChatToggleReaction = (
  input: ToggleReactionInput,
) => Promise<ChatResult<{ messageId: string }>>;
