import { Forbidden, NotFound } from "@/core/errors";
import type { WorkspaceRole } from "@/modules/workspaces/server";
import { requireWorkspaceRole } from "@/modules/workspaces/server/permissions";
import { chatDomain } from "./domain";

export class ChatGuards {
  /**
   * Resolve o workspace dono do recurso e exige membership com o papel mínimo
   * (fonte única em @/modules/workspaces/server/permissions). Default "VIEWER"
   * (qualquer membro lê); chamadas de escrita em service.ts passam "MEMBER".
   */
  async assertMember(userId: string, workspaceId: string | null, minRole: WorkspaceRole = "VIEWER"): Promise<void> {
    if (!workspaceId) throw new NotFound("Recurso não encontrado");
    await requireWorkspaceRole(userId, workspaceId, minRole);
  }

  async guardChannel(userId: string, channelId: string, minRole: WorkspaceRole = "VIEWER") {
    await this.assertMember(userId, await chatDomain.workspaceIdOfChannel(channelId), minRole);
  }

  async guardWorkspace(userId: string, workspaceId: string, minRole: WorkspaceRole = "VIEWER") {
    await this.assertMember(userId, workspaceId, minRole);
  }

  /**
   * Só os participantes da conversa podem lê-la/escrever nela — ser membro do
   * workspace não basta.
   */
  async guardConversation(userId: string, conversationId: string): Promise<void> {
    const access = await chatDomain.conversationAccess(conversationId);
    if (!access) throw new NotFound("Conversa não encontrada");
    if (!access.participantIds.includes(userId)) {
      throw new Forbidden("Você não participa desta conversa");
    }
  }
}

export function createChatGuards(): ChatGuards {
  return new ChatGuards();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const chatGuards = createChatGuards();
