import { prisma } from "@kerno/db";

/**
 * Camada de serviço (server-only) para membros de workspace.
 *
 * Aqui ficam as REGRAS DE NEGÓCIO + escrita no banco. Quem chama (a server
 * action) cuida só de autenticação/autorização e de revalidar a rota.
 * Em violação de regra, estas funções lançam Error — a action traduz pra Result.
 */

const WORKSPACE_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export async function addWorkspaceMember(input: {
  workspaceId: string;
  userId: string;
  role?: WorkspaceRole;
}): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { id: true },
  });
  if (!workspace) throw new Error("Workspace não encontrado");

  const role: WorkspaceRole =
    input.role && WORKSPACE_ROLES.includes(input.role) ? input.role : "MEMBER";

  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: input.userId, workspaceId: input.workspaceId } },
    update: { role },
    create: { userId: input.userId, workspaceId: input.workspaceId, role },
  });
}

export async function removeWorkspaceMember(input: {
  workspaceId: string;
  userId: string;
}): Promise<void> {
  const target = await prisma.workspaceUser.findUnique({
    where: { userId_workspaceId: { userId: input.userId, workspaceId: input.workspaceId } },
  });
  if (!target) throw new Error("Membro não encontrado no workspace");

  if (target.role === "ADMIN") {
    const adminCount = await prisma.workspaceUser.count({
      where: { workspaceId: input.workspaceId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new Error("O workspace precisa de pelo menos um admin");
    }
  }

  await prisma.workspaceUser.delete({
    where: { userId_workspaceId: { userId: input.userId, workspaceId: input.workspaceId } },
  });
}
