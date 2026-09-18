import { NotFound } from "@/core/errors";
import type { WorkspaceRole } from "@/modules/workspaces/server";
import { requireWorkspaceRole } from "@/modules/workspaces/server/permissions";
import * as domain from "./domain";

/**
 * Resolve o workspace dono do recurso e exige membership com o papel mínimo
 * (checagem numa fonte só, em @/modules/workspaces/server/permissions — kanban
 * só resolve "de quem é este recurso?"). Default "VIEWER" (qualquer membro lê);
 * chamadas de escrita passam "MEMBER" explicitamente — ver runCommand em
 * kanban.service.ts.
 */
export async function assertMember(
  userId: string,
  workspaceId: string | null,
  minRole: WorkspaceRole = "VIEWER",
): Promise<void> {
  if (!workspaceId) throw new NotFound("Recurso não encontrado");
  await requireWorkspaceRole(userId, workspaceId, minRole);
}

export const guardBoard = async (
  userId: string,
  boardId: string,
  minRole: WorkspaceRole = "VIEWER",
) => assertMember(userId, await domain.board.workspaceIdOfBoard(boardId), minRole);

export const guardColumn = async (
  userId: string,
  columnId: string,
  minRole: WorkspaceRole = "VIEWER",
) => assertMember(userId, await domain.board.workspaceIdOfColumn(columnId), minRole);

export const guardCard = async (
  userId: string,
  cardId: string,
  minRole: WorkspaceRole = "VIEWER",
) => assertMember(userId, await domain.board.workspaceIdOfCard(cardId), minRole);

export const guardLabel = async (
  userId: string,
  labelId: string,
  minRole: WorkspaceRole = "VIEWER",
) => assertMember(userId, await domain.board.workspaceIdOfLabel(labelId), minRole);

export const guardCycle = async (
  userId: string,
  cycleId: string,
  minRole: WorkspaceRole = "VIEWER",
) => assertMember(userId, await domain.cycle.workspaceIdOfCycle(cycleId), minRole);

export const guardStory = async (
  userId: string,
  storyId: string,
  minRole: WorkspaceRole = "VIEWER",
) => assertMember(userId, await domain.story.workspaceIdOfStory(storyId), minRole);

export async function guardComment(
  userId: string,
  commentId: string,
  minRole: WorkspaceRole = "VIEWER",
): Promise<void> {
  const cardId = await domain.cardDetail.cardIdOfComment(commentId);
  if (!cardId) throw new NotFound("Comentário não encontrado");
  await guardCard(userId, cardId, minRole);
}

export async function guardChecklist(
  userId: string,
  checklistId: string,
  minRole: WorkspaceRole = "VIEWER",
): Promise<void> {
  const cardId = await domain.checklist.cardIdOfChecklist(checklistId);
  if (!cardId) throw new NotFound("Checklist não encontrada");
  await guardCard(userId, cardId, minRole);
}

export async function guardChecklistItem(
  userId: string,
  itemId: string,
  minRole: WorkspaceRole = "VIEWER",
): Promise<void> {
  const cardId = await domain.checklist.cardIdOfChecklistItem(itemId);
  if (!cardId) throw new NotFound("Item não encontrado");
  await guardCard(userId, cardId, minRole);
}
