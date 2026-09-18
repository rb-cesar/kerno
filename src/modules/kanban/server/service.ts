import { prisma } from "@/core/db";
import { NotFound } from "@/core/errors";
import type {
  BoardData,
  BoardMetricsDTO,
  CardDetailDTO,
  KanbanCommand,
  KanbanMutationResult,
  TaskRefDTO,
} from "../types";
import * as domain from "./domain";
import {
  assertMember,
  guardBoard,
  guardCard,
  guardChecklist,
  guardChecklistItem,
  guardColumn,
  guardComment,
  guardCycle,
  guardLabel,
  guardStory,
} from "./guards";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export class KanbanService {
  /** Board padrão de um workspace (antes feito na page.tsx via prisma direto). */
  async boardForWorkspace(userId: string, workspaceId: string): Promise<BoardData> {
    await assertMember(userId, workspaceId);

    const board = await prisma.board.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!board) throw new NotFound("Board não encontrado");

    const snapshot = await domain.board.getBoardSnapshot(board.id);
    if (!snapshot) throw new NotFound("Board não encontrado");
    return snapshot;
  }

  /** Snapshot por boardId (refetch após eventos de realtime). */
  async snapshot(userId: string, boardId: string): Promise<BoardData> {
    await guardBoard(userId, boardId);
    const snapshot = await domain.board.getBoardSnapshot(boardId);
    if (!snapshot) throw new NotFound("Board não encontrado");
    return snapshot;
  }

  /** Detalhe do card (sub-tarefas + comentários + atividade) — carga sob demanda. */
  async cardDetail(userId: string, cardId: string): Promise<CardDetailDTO> {
    await guardCard(userId, cardId);
    return domain.cardDetail.getCardDetail(cardId, userId);
  }

  /** Métricas de fluxo do board (throughput, cycle/lead time, WIP). */
  async metrics(userId: string, boardId: string): Promise<BoardMetricsDTO> {
    await guardBoard(userId, boardId);
    return domain.metrics.getBoardMetrics(boardId);
  }

  /** Busca tarefas do workspace (menção `!` no chat). */
  async searchCards(userId: string, workspaceId: string, query: string): Promise<TaskRefDTO[]> {
    await assertMember(userId, workspaceId);
    return domain.board.searchCards(workspaceId, query ?? "");
  }

  /** Snapshot do board que contém um card — abre o painel da tarefa no chat. */
  async cardBoard(userId: string, cardId: string): Promise<BoardData> {
    await guardCard(userId, cardId);
    const snapshot = await domain.board.getBoardSnapshotOfCard(cardId);
    if (!snapshot) throw new NotFound("Board não encontrado");
    return snapshot;
  }

  /**
   * Espelha o antigo kanbanMutate (apps/web/.../kanban/actions.ts): cada caso
   * checa a permissão certa e chama o service. Erros (permissão/domínio) viram
   * { ok: false } para preservar o contrato KanbanMutationResult do cliente.
   */
  async runCommand(userId: string, command: KanbanCommand): Promise<KanbanMutationResult> {
    try {
      // Todo caso aqui é escrita — guard exige "MEMBER" (VIEWER só lê; ver
      // guards.ts/permissions.ts). Métodos de leitura acima (snapshot,
      // cardDetail, metrics, boardForWorkspace, searchCards, cardBoard) ficam
      // no default "VIEWER" do guard, sem mudança.
      switch (command.type) {
        case "createBoard": {
          await assertMember(userId, command.workspaceId, "MEMBER");
          const name = command.name.trim();
          if (!name) return { ok: false, error: "Nome inválido" };
          await domain.board.createBoard(command.workspaceId, name);
          break;
        }
        case "renameBoard": {
          await guardBoard(userId, command.boardId, "MEMBER");
          await domain.board.renameBoard(command.boardId, command.name);
          break;
        }
        case "deleteBoard": {
          await guardBoard(userId, command.boardId, "MEMBER");
          await domain.board.deleteBoard(command.boardId);
          break;
        }
        case "createColumn": {
          await guardBoard(userId, command.boardId, "MEMBER");
          await domain.column.createColumn(command.boardId, command.name, command.category);
          break;
        }
        case "renameColumn": {
          await guardColumn(userId, command.columnId, "MEMBER");
          await domain.column.renameColumn(command.columnId, command.name);
          break;
        }
        case "updateColumn": {
          await guardColumn(userId, command.columnId, "MEMBER");
          const name = command.name.trim();
          if (!name) return { ok: false, error: "Nome inválido" };
          const wipLimit =
            command.wipLimit != null && command.wipLimit > 0 ? command.wipLimit : null;
          await domain.column.updateColumn(command.columnId, {
            name,
            category: command.category,
            wipLimit,
          });
          break;
        }
        case "reorderColumns": {
          await guardBoard(userId, command.boardId, "MEMBER");
          await domain.column.reorderColumns(command.boardId, command.columnIds);
          break;
        }
        case "deleteColumn": {
          await guardColumn(userId, command.columnId, "MEMBER");
          await domain.column.deleteColumn(command.columnId);
          break;
        }
        case "createCard": {
          await guardColumn(userId, command.columnId, "MEMBER");
          await domain.card.createCard(command.columnId, command.title, userId);
          break;
        }
        case "updateCard": {
          await guardCard(userId, command.cardId, "MEMBER");
          await domain.card.updateCard(
            {
              cardId: command.cardId,
              title: command.title,
              description: command.description,
              assignedTo: command.assignedTo,
              labelIds: command.labelIds,
              priority: command.priority,
              dueDate: command.dueDate ? new Date(command.dueDate) : null,
              estimate: command.estimate,
              cycleId: command.cycleId,
              storyId: command.storyId,
            },
            userId,
          );
          break;
        }
        case "moveCard": {
          await guardCard(userId, command.cardId, "MEMBER");
          await domain.card.moveCard(
            {
              cardId: command.cardId,
              fromColumnId: command.fromColumnId,
              toColumnId: command.toColumnId,
              destCardIds: command.destCardIds,
              sourceCardIds: command.sourceCardIds,
            },
            userId,
          );
          break;
        }
        case "deleteCard": {
          await guardCard(userId, command.cardId, "MEMBER");
          await domain.card.deleteCard(command.cardId, userId);
          break;
        }
        case "createSubtask": {
          await guardCard(userId, command.parentId, "MEMBER");
          const title = command.title.trim();
          if (!title) return { ok: false, error: "Título vazio" };
          await domain.cardDetail.createSubtask(command.parentId, title, userId);
          break;
        }
        case "createChecklist": {
          await guardCard(userId, command.cardId, "MEMBER");
          await domain.checklist.createChecklist(
            command.cardId,
            command.title?.trim() || null,
            userId,
          );
          break;
        }
        case "renameChecklist": {
          await guardChecklist(userId, command.checklistId, "MEMBER");
          await domain.checklist.renameChecklist(
            command.checklistId,
            command.title?.trim() || null,
            userId,
          );
          break;
        }
        case "deleteChecklist": {
          await guardChecklist(userId, command.checklistId, "MEMBER");
          await domain.checklist.deleteChecklist(command.checklistId, userId);
          break;
        }
        case "addChecklistItem": {
          await guardChecklist(userId, command.checklistId, "MEMBER");
          const text = command.text.trim();
          if (!text) return { ok: false, error: "Item vazio" };
          await domain.checklist.addChecklistItem(command.checklistId, text, userId);
          break;
        }
        case "toggleChecklistItem": {
          await guardChecklistItem(userId, command.itemId, "MEMBER");
          await domain.checklist.toggleChecklistItem(command.itemId, command.done, userId);
          break;
        }
        case "updateChecklistItem": {
          await guardChecklistItem(userId, command.itemId, "MEMBER");
          const text = command.text.trim();
          if (!text) return { ok: false, error: "Item vazio" };
          await domain.checklist.updateChecklistItem(command.itemId, text, userId);
          break;
        }
        case "deleteChecklistItem": {
          await guardChecklistItem(userId, command.itemId, "MEMBER");
          await domain.checklist.deleteChecklistItem(command.itemId, userId);
          break;
        }
        case "addComment": {
          await guardCard(userId, command.cardId, "MEMBER");
          const body = command.body.trim();
          if (!body) return { ok: false, error: "Comentário vazio" };
          if (body.length > 4000) return { ok: false, error: "Comentário muito longo" };
          await domain.cardDetail.addComment(command.cardId, body, userId);
          break;
        }
        case "deleteComment": {
          await guardComment(userId, command.commentId, "MEMBER");
          await domain.cardDetail.deleteComment(command.commentId, userId);
          break;
        }
        case "createLabel": {
          await guardBoard(userId, command.boardId, "MEMBER");
          await domain.label.createLabel(command.boardId, command.name, command.color);
          break;
        }
        case "deleteLabel": {
          await guardLabel(userId, command.labelId, "MEMBER");
          await domain.label.deleteLabel(command.labelId);
          break;
        }
        case "createCycle": {
          await assertMember(userId, command.workspaceId, "MEMBER");
          const name = command.name.trim();
          if (!name) return { ok: false, error: "Nome inválido" };
          const startsAt = new Date(command.startsAt);
          const endsAt = new Date(command.endsAt);
          if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
            return { ok: false, error: "Datas inválidas" };
          }
          if (endsAt < startsAt) return { ok: false, error: "Fim antes do início" };
          await domain.cycle.createCycle(command.workspaceId, name, startsAt, endsAt);
          break;
        }
        case "deleteCycle": {
          await guardCycle(userId, command.cycleId, "MEMBER");
          await domain.cycle.deleteCycle(command.cycleId);
          break;
        }
        case "createStory": {
          await guardBoard(userId, command.boardId, "MEMBER");
          const title = command.title.trim();
          if (!title) return { ok: false, error: "Título vazio" };
          await domain.story.createStory(command.boardId, title, userId);
          break;
        }
        case "updateStory": {
          await guardStory(userId, command.storyId, "MEMBER");
          const title = command.title.trim();
          if (!title) return { ok: false, error: "Título vazio" };
          await domain.story.updateStory(
            {
              storyId: command.storyId,
              title,
              description: command.description,
              status: command.status,
              assignedTo: command.assignedTo,
              dueDate: command.dueDate ? new Date(command.dueDate) : null,
              priority: command.priority,
              color: command.color,
            },
            userId,
          );
          break;
        }
        case "deleteStory": {
          await guardStory(userId, command.storyId, "MEMBER");
          await domain.story.deleteStory(command.storyId, userId);
          break;
        }
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}

export function createKanbanService(): KanbanService {
  return new KanbanService();
}
