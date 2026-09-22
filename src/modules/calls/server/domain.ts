import { prisma } from "@/core/db";
import { createEvent, eventBus } from "@/core/events";
import type { CallDTO, CallStatus } from "../types";

type CallRow = {
  id: string;
  workspaceId: string;
  channelId: string | null;
  conversationId: string | null;
  startedBy: string;
  status: CallStatus;
  startedAt: Date;
  endedAt: Date | null;
};

const ACTIVE_STATUSES: CallStatus[] = ["RINGING", "ACTIVE"];

export class CallDomain {
  private toDTO(call: CallRow): CallDTO {
    return {
      id: call.id,
      workspaceId: call.workspaceId,
      channelId: call.channelId,
      conversationId: call.conversationId,
      startedBy: call.startedBy,
      status: call.status,
      startedAt: call.startedAt.toISOString(),
      endedAt: call.endedAt ? call.endedAt.toISOString() : null,
    };
  }

  /** Resolve workspace + participantes (só preenchido em DM) do alvo de uma chamada. */
  private async resolveTarget(
    channelId?: string | null,
    conversationId?: string | null,
  ): Promise<{ workspaceId: string; participantIds: string[] }> {
    if (channelId) {
      const channel = await prisma.channel.findUniqueOrThrow({
        where: { id: channelId },
        select: { workspaceId: true },
      });
      return { workspaceId: channel.workspaceId, participantIds: [] };
    }
    const conversation = await prisma.directConversation.findUniqueOrThrow({
      where: { id: conversationId ?? undefined },
      select: { workspaceId: true, participants: { select: { userId: true } } },
    });
    return { workspaceId: conversation.workspaceId, participantIds: conversation.participants.map((p) => p.userId) };
  }

  async findById(callId: string): Promise<CallDTO | null> {
    const call = await prisma.call.findUnique({ where: { id: callId } });
    return call ? this.toDTO(call) : null;
  }

  /** Chamada em andamento pra esse canal/conversa, se houver (evita duplicar linha). */
  async activeForTarget(target: { channelId?: string; conversationId?: string }): Promise<CallDTO | null> {
    const call = await prisma.call.findFirst({
      where: { channelId: target.channelId, conversationId: target.conversationId, status: { in: ACTIVE_STATUSES } },
      orderBy: { startedAt: "desc" },
    });
    return call ? this.toDTO(call) : null;
  }

  async activeForWorkspace(workspaceId: string): Promise<CallDTO[]> {
    const calls = await prisma.call.findMany({
      where: { workspaceId, status: { in: ACTIVE_STATUSES } },
      orderBy: { startedAt: "desc" },
    });
    return calls.map((c) => this.toDTO(c));
  }

  /** Idempotente: reaproveita a chamada em andamento do alvo, se houver, em vez de duplicar. */
  async startCall(actorId: string, input: { channelId?: string; conversationId?: string }): Promise<CallDTO> {
    const existing = await this.activeForTarget(input);
    if (existing) return existing;

    const { workspaceId, participantIds } = await this.resolveTarget(input.channelId, input.conversationId);
    const call = await prisma.call.create({
      data: {
        workspaceId,
        channelId: input.channelId ?? null,
        conversationId: input.conversationId ?? null,
        startedBy: actorId,
      },
    });

    eventBus.publish(
      createEvent(
        "call:started",
        workspaceId,
        { callId: call.id, channelId: call.channelId, conversationId: call.conversationId, participantIds },
        actorId,
      ),
    );

    return this.toDTO(call);
  }

  /** Registra o participante e passa a chamada pra ACTIVE no primeiro join. */
  async join(callId: string, userId: string): Promise<CallDTO> {
    await prisma.callParticipant.create({ data: { callId, userId } });
    const call = await prisma.call.update({ where: { id: callId }, data: { status: "ACTIVE" } });
    return this.toDTO(call);
  }

  /**
   * Fecha o registro de participação em aberto (pode não haver nenhum, se já
   * foi fechado). `isEmpty` diz pro chamador se ninguém mais ficou na
   * chamada — quem decide o que fazer com isso (encerrar) é a service, não
   * o domain.
   */
  async leave(callId: string, userId: string): Promise<{ isEmpty: boolean }> {
    await prisma.callParticipant.updateMany({ where: { callId, userId, leftAt: null }, data: { leftAt: new Date() } });
    const remaining = await prisma.callParticipant.count({ where: { callId, leftAt: null } });
    return { isEmpty: remaining === 0 };
  }

  /**
   * Idempotente: encerrar uma chamada já encerrada não republica o evento
   * nem reescreve `endedAt` — necessário porque o encerramento pode chegar
   * por mais de um caminho pra mesma chamada (quem sai por último, e o
   * webhook do LiveKit como reforço de quem só fechou a aba).
   */
  async end(callId: string, endedBy?: string): Promise<CallDTO> {
    const { count } = await prisma.call.updateMany({
      where: { id: callId, status: { not: "ENDED" } },
      data: { status: "ENDED", endedAt: new Date() },
    });
    const call = await prisma.call.findUniqueOrThrow({ where: { id: callId } });
    if (count === 0) return this.toDTO(call);

    await prisma.callParticipant.updateMany({ where: { callId, leftAt: null }, data: { leftAt: new Date() } });

    const { participantIds } = await this.resolveTarget(call.channelId, call.conversationId);
    eventBus.publish(
      createEvent(
        "call:ended",
        call.workspaceId,
        { callId: call.id, channelId: call.channelId, conversationId: call.conversationId, participantIds },
        endedBy,
      ),
    );

    return this.toDTO(call);
  }
}

export function createCallDomain(): CallDomain {
  return new CallDomain();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const callDomain = createCallDomain();
