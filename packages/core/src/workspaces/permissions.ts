import { prisma } from "@kerno/db";

export function getWorkspaceMembership(userId: string, workspaceId: string) {
  return prisma.workspaceUser.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

/** Lança se o usuário não for membro do workspace. Retorna a membership. */
export async function assertWorkspaceMember(userId: string, workspaceId: string) {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) throw new Error("Você não tem acesso a este workspace");
  return membership;
}

/** Pode gerenciar o workspace = admin. */
export async function isWorkspaceManager(userId: string, workspaceId: string): Promise<boolean> {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  return membership?.role === "ADMIN";
}
