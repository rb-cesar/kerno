// Contratos do Hub Kanban. Os DTOs e comandos vivem em @kerno/contracts
// (pacote puro, compartilhável com apps cliente). Aqui ficam só os tipos de
// wiring da camada de entrega (as server actions injetadas pelo app).

export * from "@kerno/contracts/kanban";

import type {
  BoardData,
  KanbanCommand,
  KanbanMutationResult,
} from "@kerno/contracts/kanban";

/** Server actions injetadas pelo app no componente do hub. */
export type KanbanMutate = (command: KanbanCommand) => Promise<KanbanMutationResult>;
export type KanbanFetch = (boardId: string) => Promise<BoardData | null>;
