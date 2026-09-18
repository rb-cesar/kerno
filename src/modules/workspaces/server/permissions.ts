import { prisma } from "@/core/db";
import { Forbidden } from "@/core/errors";

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

// Ordem dos papéis — só usada aqui, pra decidir se um papel "alcança" outro.
const ROLE_RANK: Record<string, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2 };

/**
 * Exige membership com papel mínimo (VIEWER < MEMBER < ADMIN). Leituras usam o
 * padrão VIEWER (== requireWorkspaceMember, qualquer membro lê); escritas
 * passam "MEMBER" explicitamente — é o que faltava: hoje um VIEWER passa em
 * requireWorkspaceMember() igual a qualquer outro papel, então nada barra
 * escrita de quem devia só ler. Devolve o papel real do usuário.
 */
export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  minRole: "VIEWER" | "MEMBER" | "ADMIN" = "VIEWER",
): Promise<string> {
  const role = await requireWorkspaceMember(userId, workspaceId);
  if ((ROLE_RANK[role] ?? -1) < (ROLE_RANK[minRole] ?? 0)) {
    throw new Forbidden("Você não tem permissão para fazer isso");
  }
  return role;
}
