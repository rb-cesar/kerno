import { Forbidden, NotFound } from "@/core/errors";
import type { WorkspaceRole } from "@/modules/workspaces/server";
import { requireWorkspaceRole } from "@/modules/workspaces/server/permissions";
import { chatDomain } from "./domain";

/**
 * Resolve o workspace dono do recurso e exige membership com o papel mínimo
 * (fonte única em @/modules/workspaces/server/permissions). Default "VIEWER"
 * (qualquer membro lê); chamadas de escrita em service.ts passam "MEMBER".
 */
export async function assertMember(
  userId: string,
  workspaceId: string | null,
  minRole: WorkspaceRole = "VIEWER",
): Promise<void> {
  if (!workspaceId) throw new NotFound("Recurso não encontrado");
  await requireWorkspaceRole(userId, workspaceId, minRole);
}

export const guardChannel = async (
  userId: string,
  channelId: string,
  minRole: WorkspaceRole = "VIEWER",
) => assertMember(userId, await chatDomain.workspaceIdOfChannel(channelId), minRole);
export const guardWorkspace = (
  userId: string,
  workspaceId: string,
  minRole: WorkspaceRole = "VIEWER",
) => assertMember(userId, workspaceId, minRole);

/**
 * Só os participantes da conversa podem lê-la/escrever nela — ser membro do
 * workspace não basta.
 */
export async function guardConversation(userId: string, conversationId: string): Promise<void> {
  const access = await chatDomain.conversationAccess(conversationId);
  if (!access) throw new NotFound("Conversa não encontrada");
  if (!access.participantIds.includes(userId)) {
    throw new Forbidden("Você não participa desta conversa");
  }
}
