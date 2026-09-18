import { Forbidden, NotFound } from "@/core/errors";
import { requireWorkspaceMember } from "@/modules/workspaces/server/permissions";
import { conversationAccess, workspaceIdOfChannel } from "./domain";

/** Resolve o workspace dono do recurso e exige membership (fonte única em @/modules/workspaces/server/permissions). */
export async function assertMember(userId: string, workspaceId: string | null): Promise<void> {
  if (!workspaceId) throw new NotFound("Recurso não encontrado");
  await requireWorkspaceMember(userId, workspaceId);
}

export const guardChannel = async (userId: string, channelId: string) =>
  assertMember(userId, await workspaceIdOfChannel(channelId));
export const guardWorkspace = (userId: string, workspaceId: string) =>
  assertMember(userId, workspaceId);

/**
 * Só os participantes da conversa podem lê-la/escrever nela — ser membro do
 * workspace não basta.
 */
export async function guardConversation(userId: string, conversationId: string): Promise<void> {
  const access = await conversationAccess(conversationId);
  if (!access) throw new NotFound("Conversa não encontrada");
  if (!access.participantIds.includes(userId)) {
    throw new Forbidden("Você não participa desta conversa");
  }
}
