import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { conversationAccess, projectIdOfChannel } from "@kerno/chat/services";
import { getProjectMembership } from "@kerno/core/workspaces";

export async function assertMember(userId: string, projectId: string | null): Promise<void> {
  if (!projectId) throw new NotFoundException("Recurso não encontrado");
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) throw new ForbiddenException("Você não tem acesso a este projeto");
}

export const guardChannel = async (userId: string, channelId: string) =>
  assertMember(userId, await projectIdOfChannel(channelId));
export const guardProject = (userId: string, projectId: string) => assertMember(userId, projectId);

/**
 * Só os participantes da conversa podem lê-la/escrever nela — ser membro do
 * projeto não basta.
 */
export async function guardConversation(userId: string, conversationId: string): Promise<void> {
  const access = await conversationAccess(conversationId);
  if (!access) throw new NotFoundException("Conversa não encontrada");
  if (!access.participantIds.includes(userId)) {
    throw new ForbiddenException("Você não participa desta conversa");
  }
}
