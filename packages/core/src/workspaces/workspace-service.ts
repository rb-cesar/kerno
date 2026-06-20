import { prisma } from "@kerno/db";

/**
 * Camada de serviço (server-only) do domínio "workspace".
 *
 * Regra do projeto: toda leitura/escrita de banco desse domínio mora aqui.
 * As rotas (page/layout/actions) NÃO importam @kerno/db direto — elas chamam
 * estas funções. É o mesmo padrão que os hubs já usam em packages/modules/<m>/services.
 */

export type WorkspaceMemberRow = { id: string; name: string; role: string };

export type WorkspaceWithMembers = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  members: WorkspaceMemberRow[];
  /** Papel do usuário atual no workspace (ou null). */
  myRole: string | null;
};

/** Snapshot do workspace + membros consumido pelo layout. */
export async function getWorkspaceWithMembers(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceWithMembers | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      users: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    members: workspace.users.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
    })),
    myRole: workspace.users.find((m) => m.userId === userId)?.role ?? null,
  };
}
