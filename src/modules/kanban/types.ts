// Contratos do Hub Kanban — DTOs (dados), comandos de mutação e os tipos de
// wiring da camada de entrega (as server actions/clients injetados pelo app).

export type { MemberDTO } from "@/core/types";

import type { MemberDTO } from "@/core/types";

/** Categoria semântica do estado (coluna). Espelha o enum StatusCategory do schema. */
export type StatusCategory = "BACKLOG" | "UNSTARTED" | "STARTED" | "COMPLETED" | "CANCELED";

/**
 * Estados padrão (estilo Linear) criados em todo board novo. Fonte única — vive
 * aqui (não em workspaces) porque é o Kanban que é dono do conceito de coluna;
 * `modules/workspaces/server/service.ts` importa isso direto daqui para criar o
 * board padrão do workspace — a única exceção conhecida à regra "módulo nunca
 * importa módulo" (bootstrap, não lógica de negócio).
 */
export const DEFAULT_BOARD_COLUMNS: { name: string; order: number; category: StatusCategory }[] = [
  { name: "Backlog", order: 0, category: "BACKLOG" },
  { name: "A fazer", order: 1, category: "UNSTARTED" },
  { name: "Em progresso", order: 2, category: "STARTED" },
  { name: "Concluído", order: 3, category: "COMPLETED" },
  { name: "Cancelado", order: 4, category: "CANCELED" },
];

export interface LabelDTO {
  id: string;
  name: string;
  color: string;
}

/** Resumo de um board do workspace — usado pelo seletor de boards. */
export interface BoardSummaryDTO {
  id: string;
  name: string;
}

/** Referência leve a uma tarefa — usada na menção de task no chat (`!`). */
export interface TaskRefDTO {
  id: string;
  number: number;
  title: string;
  workspaceKey: string; // p/ exibir `KERN-12`
}

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
  /** Total real de cards na coluna — pode ser maior que `cards.length` (ver hasMoreCards). */
  totalCards: number;
  hasMoreCards: boolean;
}

/** Página de cards de uma coluna (ver BoardDomain.getColumnCards). */
export interface CardsPage {
  items: CardDTO[];
  hasMore: boolean;
}

export interface BoardData {
  id: string;
  name: string;
  workspaceId: string;
  workspaceKey: string; // ex.: "KERN" → cards exibidos como KERN-123
  boards: BoardSummaryDTO[]; // todos os boards do workspace (seletor)
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
// todas as operações de escrita do board, com type-safety via união. Validado
// por zod na fronteira HTTP (zValidator no controller) — ver ./dto,
// cujo schema só o controller usa; o tipo é reexportado aqui porque o client
// (web) também precisa da forma de cada comando.
export type { KanbanCommand } from "./dto";

import type { KanbanCommand } from "./dto";

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

// ── Wiring da camada de entrega (server actions/clients injetados pelo app) ──

export type KanbanMutate = (command: KanbanCommand) => Promise<KanbanMutationResult>;
export type KanbanFetch = (boardId: string) => Promise<BoardData | null>;
export type KanbanFetchCardDetail = (cardId: string) => Promise<CardDetailDTO | null>;
export type KanbanFetchMetrics = (boardId: string) => Promise<BoardMetricsDTO | null>;
export type KanbanFetchColumnCards = (columnId: string, afterId?: string) => Promise<CardsPage>;
