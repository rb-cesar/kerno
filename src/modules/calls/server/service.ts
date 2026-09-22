import { prisma } from "@/core/db";
import { livekitRoomService, mintLivekitToken } from "@/core/livekit";
import type { CallDTO, CallJoinResult, CallResult, StartCallInput } from "../types";
import { callDomain } from "./domain";
import { callGuards } from "./guards";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

/** LiveKit exibe isso como o nome do participante — sem isso, cai pro identity (o id cru do usuário). */
async function displayName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? userId;
}

export class CallService {
  /** Cria a chamada (ou reaproveita uma já em andamento) e já registra quem iniciou como participante. */
  async startCall(userId: string, input: StartCallInput): Promise<CallResult<CallJoinResult>> {
    try {
      await callGuards.guardTarget(userId, input);
      const call = await callDomain.startCall(userId, input);
      await callDomain.join(call.id, userId);
      const token = await mintLivekitToken(userId, await displayName(userId), call.id);
      return { ok: true, data: { call, token } };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async joinCall(userId: string, callId: string): Promise<CallResult<CallJoinResult>> {
    try {
      await callGuards.guardCall(userId, callId);
      const call = await callDomain.join(callId, userId);
      const token = await mintLivekitToken(userId, await displayName(userId), call.id);
      return { ok: true, data: { call, token } };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  /** Quando o último participante sai, a chamada se encerra sozinha — ninguém precisa clicar em "encerrar". */
  async leaveCall(userId: string, callId: string): Promise<CallResult<{ callId: string }>> {
    try {
      await callGuards.guardCall(userId, callId);
      const { isEmpty } = await callDomain.leave(callId, userId);
      if (isEmpty) {
        await livekitRoomService.deleteRoom(callId).catch(() => {});
        await callDomain.end(callId);
      }
      return { ok: true, data: { callId } };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async activeCalls(userId: string, workspaceId: string): Promise<CallDTO[]> {
    await callGuards.guardWorkspace(userId, workspaceId);
    return callDomain.activeForWorkspace(workspaceId);
  }

  /**
   * Reforço pro caso de alguém sumir sem passar pelo `/leave` (aba fechada,
   * queda de rede): chamado pelo webhook do LiveKit quando a room esvazia de
   * verdade (`room_finished`), sem depender do nosso próprio registro de
   * participantes. Sem `userId` porque quem chama é o webhook, não uma
   * pessoa — `end()` já é idempotente se a call já tiver sido encerrada.
   */
  async autoEndCall(callId: string): Promise<void> {
    const call = await callDomain.findById(callId);
    if (!call || call.status === "ENDED") return;
    await livekitRoomService.deleteRoom(callId).catch(() => {});
    await callDomain.end(callId);
  }
}

export function createCallService(): CallService {
  return new CallService();
}
