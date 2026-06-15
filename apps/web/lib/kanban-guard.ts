import {
  projectIdOfBoard,
  projectIdOfCard,
  projectIdOfColumn,
  projectIdOfLabel,
} from "@kerno/kanban/services";
import { requireUser } from "./auth-helpers";
import { assertProjectMember } from "@kerno/workspaces";

async function guard(projectId: string | null) {
  const user = await requireUser();
  if (!projectId) throw new Error("Recurso não encontrado");
  await assertProjectMember(user.id, projectId);
  return user;
}

export const guardBoard = async (boardId: string) => guard(await projectIdOfBoard(boardId));
export const guardColumn = async (columnId: string) => guard(await projectIdOfColumn(columnId));
export const guardCard = async (cardId: string) => guard(await projectIdOfCard(cardId));
export const guardLabel = async (labelId: string) => guard(await projectIdOfLabel(labelId));
