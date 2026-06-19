// Contratos de evento — compartilhados pelo event bus (server) e pelo realtime
// (Socket.io, server↔client). Pacote puro: sem Next, Prisma ou React.

export type KernoEventType =
  | "card:created"
  | "card:moved"
  | "card:deleted"
  | "card:assigned"
  | "kanban:changed"
  | "message:sent"
  | "message:edited"
  | "dm:sent"
  | "reaction:changed"
  | "user:joined"
  | "user:left";

export interface CardCreatedPayload {
  cardId: string;
  boardId: string;
  columnId: string;
  title: string;
}

export interface CardMovedPayload {
  cardId: string;
  boardId: string;
  fromColumnId: string;
  toColumnId: string;
  title: string;
}

export interface CardDeletedPayload {
  cardId: string;
  boardId: string;
  title: string;
}

export interface CardAssignedPayload {
  cardId: string;
  boardId: string;
  assignedTo: string | null;
  title: string;
}

/**
 * Mudança em recursos do Kanban que não têm evento próprio (story, checklist,
 * vínculo de tarefa↔story). Sinaliza aos outros clientes do projeto p/ resync.
 * `cardId` (quando presente) permite o painel da tarefa aberta recarregar seu detalhe.
 */
export interface KanbanChangedPayload {
  boardId: string | null;
  cardId: string | null;
}

export interface MessageSentPayload {
  messageId: string;
  channelId: string;
  content: string;
}

/**
 * Conteúdo de uma mensagem foi editado. Em canal vai para a room do projeto;
 * em DM (participantIds preenchido) só para as rooms pessoais — mesmo roteamento
 * de `reaction:changed`.
 */
export interface MessageEditedPayload {
  messageId: string;
  channelId: string | null;
  conversationId: string | null;
  participantIds: string[];
  content: string;
}

/**
 * Mensagem privada. Diferente de `message:sent`, NÃO é entregue à room do
 * projeto: o dispatcher roteia só para as rooms pessoais dos `participantIds`.
 */
export interface DirectMessagePayload {
  messageId: string;
  conversationId: string;
  participantIds: string[];
}

/**
 * Reação adicionada/removida numa mensagem. Em canal vai para a room do projeto;
 * em DM (conversationId + participantIds) só para as rooms pessoais.
 */
export interface ReactionChangedPayload {
  messageId: string;
  channelId: string | null;
  conversationId: string | null;
  participantIds: string[];
}

export interface UserPresencePayload {
  userId: string;
}

// Mapa tipo -> payload. Garante segurança de tipos no publish/subscribe.
export interface KernoEventMap {
  "card:created": CardCreatedPayload;
  "card:moved": CardMovedPayload;
  "card:deleted": CardDeletedPayload;
  "card:assigned": CardAssignedPayload;
  "kanban:changed": KanbanChangedPayload;
  "message:sent": MessageSentPayload;
  "message:edited": MessageEditedPayload;
  "dm:sent": DirectMessagePayload;
  "reaction:changed": ReactionChangedPayload;
  "user:joined": UserPresencePayload;
  "user:left": UserPresencePayload;
}

export interface KernoEventBase {
  projectId: string;
  userId?: string;
  at: string; // ISO timestamp
}

export type KernoEvent<T extends KernoEventType = KernoEventType> = KernoEventBase & {
  type: T;
  payload: KernoEventMap[T];
};

// União discriminada de verdade (um membro por tipo). Use em handlers que
// recebem "qualquer evento" — o `switch (event.type)` estreita o payload.
export type AnyKernoEvent = { [K in KernoEventType]: KernoEvent<K> }[KernoEventType];
