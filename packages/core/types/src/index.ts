// Contratos compartilhados entre o núcleo e os hubs.
// O event bus (@kerno/events) e o realtime (Socket.io) são tipados por aqui.

export type KernoEventType =
  | "card:created"
  | "card:moved"
  | "card:deleted"
  | "card:assigned"
  | "message:sent"
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

export interface MessageSentPayload {
  messageId: string;
  channelId: string;
  content: string;
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
  "message:sent": MessageSentPayload;
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
