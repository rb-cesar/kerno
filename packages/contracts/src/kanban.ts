// Contratos do Hub Kanban — DTOs (dados) + comandos de mutação.
// Pacote puro: sem Next, Prisma ou React. Consumível por qualquer app cliente.

import type { MemberDTO } from "./common";

export type { MemberDTO };

export interface LabelDTO {
  id: string;
  name: string;
  color: string;
}

export interface CardDTO {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  order: number;
  assignedTo: string | null;
  assignee: MemberDTO | null;
  labels: LabelDTO[];
}

export interface ColumnDTO {
  id: string;
  name: string;
  order: number;
  cards: CardDTO[];
}

export interface BoardData {
  id: string;
  name: string;
  projectId: string;
  columns: ColumnDTO[];
  labels: LabelDTO[];
  members: MemberDTO[];
}

// Comando único de mutação (command pattern) — um payload serializável cobre
// todas as operações de escrita do board, com type-safety via união.
export type KanbanCommand =
  | { type: "createColumn"; boardId: string; name: string }
  | { type: "renameColumn"; columnId: string; name: string }
  | { type: "deleteColumn"; columnId: string }
  | { type: "createCard"; columnId: string; title: string }
  | {
      type: "updateCard";
      cardId: string;
      title: string;
      description: string | null;
      assignedTo: string | null;
      labelIds: string[];
    }
  | {
      type: "moveCard";
      cardId: string;
      fromColumnId: string;
      toColumnId: string;
      destCardIds: string[];
      sourceCardIds: string[];
    }
  | { type: "deleteCard"; cardId: string }
  | { type: "createLabel"; boardId: string; name: string; color: string }
  | { type: "deleteLabel"; labelId: string };

export type KanbanMutationResult = { ok: true } | { ok: false; error: string };
