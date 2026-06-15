import { prisma } from "@kerno/db";
import { getWorkspaceMembership } from "./permissions";

/**
 * Camada de serviço (server-only) para membros de projeto.
 *
 * Aqui ficam as REGRAS DE NEGÓCIO + escrita no banco. Quem chama (a server
 * action) cuida só de autenticação/autorização e de revalidar a rota.
 * Em violação de regra, estas funções lançam Error — a action traduz pra Result.
 */

const PROJECT_ROLES = ["LEAD", "MEMBER", "VIEWER"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export async function addProjectMember(input: {
  projectId: string;
  userId: string;
  role?: ProjectRole;
}): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { workspaceId: true },
  });
  if (!project) throw new Error("Projeto não encontrado");

  const isWorkspaceMember = await getWorkspaceMembership(input.userId, project.workspaceId);
  if (!isWorkspaceMember) throw new Error("Usuário não é membro do workspace");

  const role: ProjectRole =
    input.role && PROJECT_ROLES.includes(input.role) ? input.role : "MEMBER";

  await prisma.projectUser.upsert({
    where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
    update: { role },
    create: { userId: input.userId, projectId: input.projectId, role },
  });
}

export async function removeProjectMember(input: {
  projectId: string;
  userId: string;
}): Promise<void> {
  const target = await prisma.projectUser.findUnique({
    where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
  });
  if (!target) throw new Error("Membro não encontrado no projeto");

  if (target.role === "LEAD") {
    const leadCount = await prisma.projectUser.count({
      where: { projectId: input.projectId, role: "LEAD" },
    });
    if (leadCount <= 1) {
      throw new Error("O projeto precisa de pelo menos um lead");
    }
  }

  await prisma.projectUser.delete({
    where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
  });
}
