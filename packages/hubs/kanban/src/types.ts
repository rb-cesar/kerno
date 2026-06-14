// Contratos do Hub Kanban — compartilhados entre services (server) e UI (client).

export interface LabelDTO {
  id: string;
  name: string;
  color: string;
}

export interface MemberDTO {
  id: string;
  name: string;
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

// Comando único de mutação (command pattern) — uma server action serializável
// cobre todas as operações de escrita do board, com type-safety via união.
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

/** Server actions injetadas pelo app no componente do hub. */
export type KanbanMutate = (command: KanbanCommand) => Promise<KanbanMutationResult>;
export type KanbanFetch = (boardId: string) => Promise<BoardData | null>;
