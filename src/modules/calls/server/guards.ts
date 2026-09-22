import { NotFound } from "@/core/errors";
import { chatGuards } from "@/modules/chat/server";
import { callDomain } from "./domain";

/**
 * Reusa os guards do chat em vez de duplicar a checagem de membership — uma
 * call pertence a um canal ou a uma conversa, cujo acesso já é regra do chat.
 */
export class CallGuards {
  async guardWorkspace(userId: string, workspaceId: string): Promise<void> {
    await chatGuards.guardWorkspace(userId, workspaceId);
  }

  /** Acesso ao alvo de uma chamada nova, antes dela existir. */
  async guardTarget(userId: string, target: { channelId?: string; conversationId?: string }): Promise<void> {
    if (target.channelId) await chatGuards.guardChannel(userId, target.channelId, "MEMBER");
    else if (target.conversationId) await chatGuards.guardConversation(userId, target.conversationId);
  }

  /** Acesso a uma chamada já existente, pelo canal/conversa dona dela. */
  async guardCall(userId: string, callId: string): Promise<void> {
    const call = await callDomain.findById(callId);
    if (!call) throw new NotFound("Chamada não encontrada");
    await this.guardTarget(userId, {
      channelId: call.channelId ?? undefined,
      conversationId: call.conversationId ?? undefined,
    });
  }
}

export function createCallGuards(): CallGuards {
  return new CallGuards();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const callGuards = createCallGuards();
