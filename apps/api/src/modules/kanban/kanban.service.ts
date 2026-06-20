import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@kerno/db";
import * as kanban from "@kerno/kanban/services";
import type {
  BoardData,
  BoardMetricsDTO,
  CardDetailDTO,
  KanbanCommand,
  KanbanMutationResult,
} from "@kerno/contracts/kanban";
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
} from "./kanban-permissions";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

@Injectable()
export class KanbanService {
  /** Board padrão de um workspace (antes feito na page.tsx via prisma direto). */
  async boardForWorkspace(userId: string, workspaceId: string): Promise<BoardData> {
    await assertMember(userId, workspaceId);

    const board = await prisma.board.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!board) throw new NotFoundException("Board não encontrado");

    const snapshot = await kanban.getBoardSnapshot(board.id);
    if (!snapshot) throw new NotFoundException("Board não encontrado");
    return snapshot;
  }

  /** Snapshot por boardId (refetch após eventos de realtime). */
  async snapshot(userId: string, boardId: string): Promise<BoardData> {
    await guardBoard(userId, boardId);
    const snapshot = await kanban.getBoardSnapshot(boardId);
    if (!snapshot) throw new NotFoundException("Board não encontrado");
    return snapshot;
  }

  /** Detalhe do card (sub-tarefas + comentários + atividade) — carga sob demanda. */
  async cardDetail(userId: string, cardId: string): Promise<CardDetailDTO> {
    await guardCard(userId, cardId);
    return kanban.getCardDetail(cardId, userId);
  }

  /** Métricas de fluxo do board (throughput, cycle/lead time, WIP). */
  async metrics(userId: string, boardId: string): Promise<BoardMetricsDTO> {
    await guardBoard(userId, boardId);
    return kanban.getBoardMetrics(boardId);
  }

  /**
   * Espelha o antigo kanbanMutate (apps/web/.../kanban/actions.ts): cada caso
   * checa a permissão certa e chama o service. Erros (permissão/domínio) viram
   * { ok: false } para preservar o contrato KanbanMutationResult do cliente.
   */
  async runCommand(userId: string, command: KanbanCommand): Promise<KanbanMutationResult> {
    try {
      switch (command.type) {
        case "createColumn": {
          await guardBoard(userId, command.boardId);
          await kanban.createColumn(command.boardId, command.name, command.category);
          break;
        }
        case "renameColumn": {
          await guardColumn(userId, command.columnId);
          await kanban.renameColumn(command.columnId, command.name);
          break;
        }
        case "updateColumn": {
          await guardColumn(userId, command.columnId);
          const name = command.name.trim();
          if (!name) return { ok: false, error: "Nome inválido" };
          const wipLimit =
            command.wipLimit != null && command.wipLimit > 0 ? command.wipLimit : null;
          await kanban.updateColumn(command.columnId, {
            name,
            category: command.category,
            wipLimit,
          });
          break;
        }
        case "reorderColumns": {
          await guardBoard(userId, command.boardId);
          await kanban.reorderColumns(command.boardId, command.columnIds);
          break;
        }
        case "deleteColumn": {
          await guardColumn(userId, command.columnId);
          await kanban.deleteColumn(command.columnId);
          break;
        }
        case "createCard": {
          await guardColumn(userId, command.columnId);
          await kanban.createCard(command.columnId, command.title, userId);
          break;
        }
        case "updateCard": {
          await guardCard(userId, command.cardId);
          await kanban.updateCard(
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
          await guardCard(userId, command.cardId);
          await kanban.moveCard(
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
          await guardCard(userId, command.cardId);
          await kanban.deleteCard(command.cardId, userId);
          break;
        }
        case "createSubtask": {
          await guardCard(userId, command.parentId);
          const title = command.title.trim();
          if (!title) return { ok: false, error: "Título vazio" };
          await kanban.createSubtask(command.parentId, title, userId);
          break;
        }
        case "createChecklist": {
          await guardCard(userId, command.cardId);
          await kanban.createChecklist(command.cardId, command.title?.trim() || null, userId);
          break;
        }
        case "renameChecklist": {
          await guardChecklist(userId, command.checklistId);
          await kanban.renameChecklist(command.checklistId, command.title?.trim() || null, userId);
          break;
        }
        case "deleteChecklist": {
          await guardChecklist(userId, command.checklistId);
          await kanban.deleteChecklist(command.checklistId, userId);
          break;
        }
        case "addChecklistItem": {
          await guardChecklist(userId, command.checklistId);
          const text = command.text.trim();
          if (!text) return { ok: false, error: "Item vazio" };
          await kanban.addChecklistItem(command.checklistId, text, userId);
          break;
        }
        case "toggleChecklistItem": {
          await guardChecklistItem(userId, command.itemId);
          await kanban.toggleChecklistItem(command.itemId, command.done, userId);
          break;
        }
        case "updateChecklistItem": {
          await guardChecklistItem(userId, command.itemId);
          const text = command.text.trim();
          if (!text) return { ok: false, error: "Item vazio" };
          await kanban.updateChecklistItem(command.itemId, text, userId);
          break;
        }
        case "deleteChecklistItem": {
          await guardChecklistItem(userId, command.itemId);
          await kanban.deleteChecklistItem(command.itemId, userId);
          break;
        }
        case "addComment": {
          await guardCard(userId, command.cardId);
          const body = command.body.trim();
          if (!body) return { ok: false, error: "Comentário vazio" };
          if (body.length > 4000) return { ok: false, error: "Comentário muito longo" };
          await kanban.addComment(command.cardId, body, userId);
          break;
        }
        case "deleteComment": {
          await guardComment(userId, command.commentId);
          await kanban.deleteComment(command.commentId, userId);
          break;
        }
        case "createLabel": {
          await guardBoard(userId, command.boardId);
          await kanban.createLabel(command.boardId, command.name, command.color);
          break;
        }
        case "deleteLabel": {
          await guardLabel(userId, command.labelId);
          await kanban.deleteLabel(command.labelId);
          break;
        }
        case "createCycle": {
          await assertMember(userId, command.workspaceId);
          const name = command.name.trim();
          if (!name) return { ok: false, error: "Nome inválido" };
          const startsAt = new Date(command.startsAt);
          const endsAt = new Date(command.endsAt);
          if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
            return { ok: false, error: "Datas inválidas" };
          }
          if (endsAt < startsAt) return { ok: false, error: "Fim antes do início" };
          await kanban.createCycle(command.workspaceId, name, startsAt, endsAt);
          break;
        }
        case "deleteCycle": {
          await guardCycle(userId, command.cycleId);
          await kanban.deleteCycle(command.cycleId);
          break;
        }
        case "createStory": {
          await guardBoard(userId, command.boardId);
          const title = command.title.trim();
          if (!title) return { ok: false, error: "Título vazio" };
          await kanban.createStory(command.boardId, title, userId);
          break;
        }
        case "updateStory": {
          await guardStory(userId, command.storyId);
          const title = command.title.trim();
          if (!title) return { ok: false, error: "Título vazio" };
          await kanban.updateStory(
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
          await guardStory(userId, command.storyId);
          await kanban.deleteStory(command.storyId, userId);
          break;
        }
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}
