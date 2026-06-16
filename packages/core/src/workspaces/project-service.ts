import { prisma } from "@kerno/db";

/**
 * Camada de serviço (server-only) do domínio "projeto".
 *
 * Regra do projeto: toda leitura/escrita de banco desse domínio mora aqui.
 * As rotas (page/layout/actions) NÃO importam @kerno/db direto — elas chamam
 * estas funções. É o mesmo padrão que os hubs já usam em packages/hubs/<hub>/services.
 */

export type ProjectMemberRow = { id: string; name: string; role: string };
export type WorkspaceMemberRow = { id: string; name: string };

export type ProjectWithMembers = {
  id: string;
  name: string;
  projectMembers: ProjectMemberRow[];
  workspaceMembers: WorkspaceMemberRow[];
  /** Papel do usuário atual no workspace dono do projeto (ou null). */
  myWorkspaceRole: string | null;
};

/** Snapshot do projeto + membros consumido pelo layout do projeto. */
export async function getProjectWithMembers(
  projectId: string,
  userId: string,
): Promise<ProjectWithMembers | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      users: { include: { user: { select: { id: true, name: true } } } },
      workspace: {
        select: {
          users: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!project) return null;

  return {
    id: project.id,
    name: project.name,
    projectMembers: project.users.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
    })),
    workspaceMembers: project.workspace.users.map((m) => ({
      id: m.user.id,
      name: m.user.name,
    })),
    myWorkspaceRole:
      project.workspace.users.find((m) => m.userId === userId)?.role ?? null,
  };
}
