// Contratos do Hub Kanban — DTOs (dados) + comandos de mutação.
// Pacote puro: sem Next, Prisma ou React. Consumível por qualquer app cliente.

import type { MemberDTO } from "./common";

export type { MemberDTO };

export interface LabelDTO {
  id: string;
  name: string;
  color: string;
}

/** Categoria semântica do estado (coluna). Espelha o enum StatusCategory do schema. */
export type StatusCategory = "BACKLOG" | "UNSTARTED" | "STARTED" | "COMPLETED" | "CANCELED";

/** Prioridade do card. Espelha o enum Priority do schema. */
export type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/** Cycle/sprint: iteração com prazo, à qual cards podem ser atribuídos. */
export interface CycleDTO {
  id: string;
  name: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
}

/** User Story (épico) à qual tarefas podem ser vinculadas. */
export interface StoryDTO {
  id: string;
  number: number; // exibido como `${workspaceKey}-S${number}`
  title: string;
  description: string | null;
  status: StatusCategory;
  assignedTo: string | null;
  assignee: MemberDTO | null;
  dueDate: string | null; // ISO
  priority: Priority;
  color: string | null;
  taskCount: number; // nº de tarefas vinculadas
}

export interface CardDTO {
  id: string;
  number: number; // exibido como `${workspaceKey}-${number}`
  title: string;
  description: string | null;
  columnId: string;
  order: number;
  priority: Priority;
  dueDate: string | null; // ISO
  estimate: number | null; // story points
  parentId: string | null; // sub-issue (UI na F1)
  cycleId: string | null;
  storyId: string | null;
  storyTitle: string | null; // título da story vinculada (p/ tooltip no tile)
  assignedTo: string | null;
  assignee: MemberDTO | null;
  labels: LabelDTO[];
}

export interface ColumnDTO {
  id: string;
  name: string;
  order: number;
  category: StatusCategory;
  color: string | null;
  wipLimit: number | null;
  cards: CardDTO[];
}

export interface BoardData {
  id: string;
  name: string;
  workspaceId: string;
  workspaceKey: string; // ex.: "KERN" → cards exibidos como KERN-123
  columns: ColumnDTO[];
  labels: LabelDTO[];
  cycles: CycleDTO[];
  stories: StoryDTO[];
  members: MemberDTO[];
}

// ── Detalhe do card (carregado sob demanda ao abrir o card) ──────────────────

export interface CardCommentDTO {
  id: string;
  author: MemberDTO | null;
  body: string;
  createdAt: string; // ISO
  mine: boolean; // o usuário atual é o autor
}

/** Uma entrada da linha do tempo do card (derivada do histórico de estado). */
export interface CardActivityDTO {
  id: string;
  at: string; // ISO
  actorName: string | null;
  toColumnName: string;
  category: StatusCategory;
  initial: boolean; // true = criação do card (sem coluna de origem)
}

/** Resumo de uma sub-tarefa (card filho). */
export interface CardChildDTO {
  id: string;
  number: number;
  title: string;
  category: StatusCategory; // categoria do estado atual
  done: boolean; // category === "COMPLETED"
}

export interface ChecklistItemDTO {
  id: string;
  text: string;
  done: boolean;
}

/** Uma todolist do card; `title` opcional nomeia o grupo. */
export interface ChecklistDTO {
  id: string;
  title: string | null;
  items: ChecklistItemDTO[];
}

export interface CardDetailDTO {
  cardId: string;
  children: CardChildDTO[];
  checklists: ChecklistDTO[];
  comments: CardCommentDTO[];
  activity: CardActivityDTO[];
}

// Comando único de mutação (command pattern) — um payload serializável cobre
// todas as operações de escrita do board, com type-safety via união.
export type KanbanCommand =
  | { type: "createColumn"; boardId: string; name: string; category?: StatusCategory }
  | { type: "renameColumn"; columnId: string; name: string }
  | {
      type: "updateColumn";
      columnId: string;
      name: string;
      category: StatusCategory;
      wipLimit: number | null;
    }
  | { type: "deleteColumn"; columnId: string }
  | { type: "reorderColumns"; boardId: string; columnIds: string[] }
  | { type: "createCard"; columnId: string; title: string }
  | {
      type: "updateCard";
      cardId: string;
      title: string;
      description: string | null;
      assignedTo: string | null;
      labelIds: string[];
      priority: Priority;
      dueDate: string | null;
      estimate: number | null;
      cycleId: string | null;
      storyId: string | null;
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
  | { type: "createSubtask"; parentId: string; title: string }
  | { type: "createChecklist"; cardId: string; title?: string }
  | { type: "renameChecklist"; checklistId: string; title: string | null }
  | { type: "deleteChecklist"; checklistId: string }
  | { type: "addChecklistItem"; checklistId: string; text: string }
  | { type: "toggleChecklistItem"; itemId: string; done: boolean }
  | { type: "updateChecklistItem"; itemId: string; text: string }
  | { type: "deleteChecklistItem"; itemId: string }
  | { type: "addComment"; cardId: string; body: string }
  | { type: "deleteComment"; commentId: string }
  | { type: "createLabel"; boardId: string; name: string; color: string }
  | { type: "deleteLabel"; labelId: string }
  | {
      type: "createCycle";
      workspaceId: string;
      name: string;
      startsAt: string;
      endsAt: string;
    }
  | { type: "deleteCycle"; cycleId: string }
  | { type: "createStory"; boardId: string; title: string }
  | {
      type: "updateStory";
      storyId: string;
      title: string;
      description: string | null;
      status: StatusCategory;
      assignedTo: string | null;
      dueDate: string | null;
      priority: Priority;
      color: string | null;
    }
  | { type: "deleteStory"; storyId: string };

export type KanbanMutationResult = { ok: true } | { ok: false; error: string };

// ── Métricas de fluxo (derivadas do histórico CardStatusEvent) ───────────────

export interface ThroughputBucket {
  weekStart: string; // ISO yyyy-mm-dd (segunda-feira da semana)
  count: number; // cards concluídos naquela semana
}

export interface BoardMetricsDTO {
  completedCount: number; // total de cards já concluídos
  wip: number; // cards atualmente em colunas STARTED
  avgCycleTimeDays: number | null; // 1º STARTED → 1º COMPLETED
  avgLeadTimeDays: number | null; // criação → 1º COMPLETED
  throughput: ThroughputBucket[]; // últimas 8 semanas, ordem cronológica
}
