import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { conversationAccess, workspaceIdOfChannel } from "@kerno/chat/services";
import { getWorkspaceMembership } from "@kerno/core/workspaces";

export async function assertMember(userId: string, workspaceId: string | null): Promise<void> {
  if (!workspaceId) throw new NotFoundException("Recurso não encontrado");
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) throw new ForbiddenException("Você não tem acesso a este workspace");
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
  if (!access) throw new NotFoundException("Conversa não encontrada");
  if (!access.participantIds.includes(userId)) {
    throw new ForbiddenException("Você não participa desta conversa");
  }
}
