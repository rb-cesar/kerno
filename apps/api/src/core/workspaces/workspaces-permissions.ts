import { ForbiddenException } from "@nestjs/common";
import { getWorkspaceMembership, isProjectManager } from "@kerno/core/workspaces";

/** Exige membership no workspace; devolve o papel. */
export async function requireWorkspaceMember(userId: string, workspaceId: string): Promise<string> {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) throw new ForbiddenException("Você não tem acesso a este workspace");
  return membership.role;
}

export async function requireWorkspaceAdmin(userId: string, workspaceId: string): Promise<void> {
  const role = await requireWorkspaceMember(userId, workspaceId);
  if (role !== "ADMIN") throw new ForbiddenException("Apenas administradores podem fazer isso");
}

export async function requireProjectManager(userId: string, projectId: string): Promise<void> {
  if (!(await isProjectManager(userId, projectId))) {
    throw new ForbiddenException("Sem permissão para gerenciar membros");
  }
}
