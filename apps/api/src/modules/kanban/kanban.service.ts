import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@kerno/db";
import * as kanban from "@kerno/kanban/services";
import type { BoardData, KanbanCommand, KanbanMutationResult } from "@kerno/contracts/kanban";
import { assertMember, guardBoard, guardCard, guardColumn, guardLabel } from "./kanban-permissions";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

@Injectable()
export class KanbanService {
  /** Board padrão de um projeto (antes feito na page.tsx via prisma direto). */
  async boardForProject(userId: string, projectId: string): Promise<BoardData> {
    await assertMember(userId, projectId);

    const board = await prisma.board.findFirst({
      where: { projectId },
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
          await kanban.createColumn(command.boardId, command.name);
          break;
        }
        case "renameColumn": {
          await guardColumn(userId, command.columnId);
          await kanban.renameColumn(command.columnId, command.name);
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
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}
