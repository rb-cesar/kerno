import { NotFound } from "@/core/errors";
import { requireWorkspaceMember } from "@/modules/workspaces/server/permissions";
import {
  cardIdOfChecklist,
  cardIdOfChecklistItem,
  cardIdOfComment,
  workspaceIdOfBoard,
  workspaceIdOfCard,
  workspaceIdOfColumn,
  workspaceIdOfCycle,
  workspaceIdOfLabel,
  workspaceIdOfStory,
} from "./domain";

/**
 * Resolve o workspace dono do recurso e exige membership (checagem numa fonte
 * só, em @/modules/workspaces/server/permissions — kanban só resolve "de quem é este recurso?").
 */
export async function assertMember(userId: string, workspaceId: string | null): Promise<void> {
  if (!workspaceId) throw new NotFound("Recurso não encontrado");
  await requireWorkspaceMember(userId, workspaceId);
}

export const guardBoard = async (userId: string, boardId: string) =>
  assertMember(userId, await workspaceIdOfBoard(boardId));
export const guardColumn = async (userId: string, columnId: string) =>
  assertMember(userId, await workspaceIdOfColumn(columnId));
export const guardCard = async (userId: string, cardId: string) =>
  assertMember(userId, await workspaceIdOfCard(cardId));
export const guardLabel = async (userId: string, labelId: string) =>
  assertMember(userId, await workspaceIdOfLabel(labelId));
export const guardCycle = async (userId: string, cycleId: string) =>
  assertMember(userId, await workspaceIdOfCycle(cycleId));
export const guardStory = async (userId: string, storyId: string) =>
  assertMember(userId, await workspaceIdOfStory(storyId));
export async function guardComment(userId: string, commentId: string): Promise<void> {
  const cardId = await cardIdOfComment(commentId);
  if (!cardId) throw new NotFound("Comentário não encontrado");
  await guardCard(userId, cardId);
}
export async function guardChecklist(userId: string, checklistId: string): Promise<void> {
  const cardId = await cardIdOfChecklist(checklistId);
  if (!cardId) throw new NotFound("Checklist não encontrada");
  await guardCard(userId, cardId);
}
export async function guardChecklistItem(userId: string, itemId: string): Promise<void> {
  const cardId = await cardIdOfChecklistItem(itemId);
  if (!cardId) throw new NotFound("Item não encontrado");
  await guardCard(userId, cardId);
}
