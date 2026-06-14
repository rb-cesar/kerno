import { prisma } from "@kerno/db";

export function getWorkspaceMembership(userId: string, workspaceId: string) {
  return prisma.workspaceUser.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

export function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectUser.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

/** Lança se o usuário não for membro do workspace. Retorna a membership. */
export async function assertWorkspaceMember(userId: string, workspaceId: string) {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) throw new Error("Você não tem acesso a este workspace");
  return membership;
}

/** Lança se o usuário não for membro do projeto. Retorna a membership. */
export async function assertProjectMember(userId: string, projectId: string) {
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) throw new Error("Você não tem acesso a este projeto");
  return membership;
}

/** Pode gerenciar o projeto = admin do workspace OU lead do projeto. */
export async function isProjectManager(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) return false;

  const [workspaceMembership, projectMembership] = await Promise.all([
    getWorkspaceMembership(userId, project.workspaceId),
    getProjectMembership(userId, projectId),
  ]);

  return workspaceMembership?.role === "ADMIN" || projectMembership?.role === "LEAD";
}
