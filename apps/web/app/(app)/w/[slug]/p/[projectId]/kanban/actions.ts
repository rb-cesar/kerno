"use server";

import * as kanban from "@kerno/hub-kanban/services";
import type { BoardData, KanbanCommand, KanbanMutationResult } from "@kerno/hub-kanban/types";
import { guardBoard, guardCard, guardColumn, guardLabel } from "@/lib/kanban-guard";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export async function kanbanFetch(boardId: string): Promise<BoardData | null> {
  await guardBoard(boardId);
  return kanban.getBoardSnapshot(boardId);
}

export async function kanbanMutate(command: KanbanCommand): Promise<KanbanMutationResult> {
  try {
    switch (command.type) {
      case "createColumn": {
        await guardBoard(command.boardId);
        await kanban.createColumn(command.boardId, command.name);
        break;
      }
      case "renameColumn": {
        await guardColumn(command.columnId);
        await kanban.renameColumn(command.columnId, command.name);
        break;
      }
      case "deleteColumn": {
        await guardColumn(command.columnId);
        await kanban.deleteColumn(command.columnId);
        break;
      }
      case "createCard": {
        const user = await guardColumn(command.columnId);
        await kanban.createCard(command.columnId, command.title, user.id);
        break;
      }
      case "updateCard": {
        const user = await guardCard(command.cardId);
        await kanban.updateCard(
          {
            cardId: command.cardId,
            title: command.title,
            description: command.description,
            assignedTo: command.assignedTo,
            labelIds: command.labelIds,
          },
          user.id,
        );
        break;
      }
      case "moveCard": {
        const user = await guardCard(command.cardId);
        await kanban.moveCard(
          {
            cardId: command.cardId,
            fromColumnId: command.fromColumnId,
            toColumnId: command.toColumnId,
            destCardIds: command.destCardIds,
            sourceCardIds: command.sourceCardIds,
          },
          user.id,
        );
        break;
      }
      case "deleteCard": {
        const user = await guardCard(command.cardId);
        await kanban.deleteCard(command.cardId, user.id);
        break;
      }
      case "createLabel": {
        await guardBoard(command.boardId);
        await kanban.createLabel(command.boardId, command.name, command.color);
        break;
      }
      case "deleteLabel": {
        await guardLabel(command.labelId);
        await kanban.deleteLabel(command.labelId);
        break;
      }
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
