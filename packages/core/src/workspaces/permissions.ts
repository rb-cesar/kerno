import { prisma } from "@kerno/db";
import { Forbidden } from "../errors";

export function getWorkspaceMembership(userId: string, workspaceId: string) {
  return prisma.workspaceUser.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

/** Exige membership no workspace; devolve o papel. */
export async function requireWorkspaceMember(userId: string, workspaceId: string): Promise<string> {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) throw new Forbidden("Você não tem acesso a este workspace");
  return membership.role;
}

/** Só admin pode gerenciar o workspace (convidar/remover/trocar papel de membro). */
export async function requireWorkspaceAdmin(userId: string, workspaceId: string): Promise<void> {
  const role = await requireWorkspaceMember(userId, workspaceId);
  if (role !== "ADMIN") throw new Forbidden("Apenas administradores podem fazer isso");
}
