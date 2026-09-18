import { NotFound } from "@/core/errors";
import type { WorkspaceRole } from "@/modules/workspaces/server";
import { requireWorkspaceRole } from "@/modules/workspaces/server/permissions";
import * as domain from "./domain";

export class KanbanGuards {
  /**
   * Resolve o workspace dono do recurso e exige membership com o papel mínimo
   * (checagem numa fonte só, em @/modules/workspaces/server/permissions — kanban
   * só resolve "de quem é este recurso?"). Default "VIEWER" (qualquer membro lê);
   * chamadas de escrita passam "MEMBER" explicitamente — ver runCommand em
   * kanban.service.ts.
   */
  async assertMember(userId: string, workspaceId: string | null, minRole: WorkspaceRole = "VIEWER"): Promise<void> {
    if (!workspaceId) throw new NotFound("Recurso não encontrado");
    await requireWorkspaceRole(userId, workspaceId, minRole);
  }

  async guardBoard(userId: string, boardId: string, minRole: WorkspaceRole = "VIEWER") {
    await this.assertMember(userId, await domain.board.workspaceIdOfBoard(boardId), minRole);
  }

  async guardColumn(userId: string, columnId: string, minRole: WorkspaceRole = "VIEWER") {
    await this.assertMember(userId, await domain.board.workspaceIdOfColumn(columnId), minRole);
  }

  async guardCard(userId: string, cardId: string, minRole: WorkspaceRole = "VIEWER") {
    await this.assertMember(userId, await domain.board.workspaceIdOfCard(cardId), minRole);
  }

  async guardLabel(userId: string, labelId: string, minRole: WorkspaceRole = "VIEWER") {
    await this.assertMember(userId, await domain.board.workspaceIdOfLabel(labelId), minRole);
  }

  async guardCycle(userId: string, cycleId: string, minRole: WorkspaceRole = "VIEWER") {
    await this.assertMember(userId, await domain.cycle.workspaceIdOfCycle(cycleId), minRole);
  }

  async guardStory(userId: string, storyId: string, minRole: WorkspaceRole = "VIEWER") {
    await this.assertMember(userId, await domain.story.workspaceIdOfStory(storyId), minRole);
  }

  async guardComment(userId: string, commentId: string, minRole: WorkspaceRole = "VIEWER"): Promise<void> {
    const cardId = await domain.cardDetail.cardIdOfComment(commentId);
    if (!cardId) throw new NotFound("Comentário não encontrado");
    await this.guardCard(userId, cardId, minRole);
  }

  async guardChecklist(userId: string, checklistId: string, minRole: WorkspaceRole = "VIEWER"): Promise<void> {
    const cardId = await domain.checklist.cardIdOfChecklist(checklistId);
    if (!cardId) throw new NotFound("Checklist não encontrada");
    await this.guardCard(userId, cardId, minRole);
  }

  async guardChecklistItem(userId: string, itemId: string, minRole: WorkspaceRole = "VIEWER"): Promise<void> {
    const cardId = await domain.checklist.cardIdOfChecklistItem(itemId);
    if (!cardId) throw new NotFound("Item não encontrado");
    await this.guardCard(userId, cardId, minRole);
  }
}

export function createKanbanGuards(): KanbanGuards {
  return new KanbanGuards();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const kanbanGuards = createKanbanGuards();
