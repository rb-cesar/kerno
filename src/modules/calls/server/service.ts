import { livekitRoomService, mintLivekitToken } from "@/core/livekit";
import type { CallDTO, CallJoinResult, CallResult, StartCallInput } from "../types";
import { callDomain } from "./domain";
import { callGuards } from "./guards";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export class CallService {
  /** Cria a chamada (ou reaproveita uma já em andamento) e já registra quem iniciou como participante. */
  async startCall(userId: string, input: StartCallInput): Promise<CallResult<CallJoinResult>> {
    try {
      await callGuards.guardTarget(userId, input);
      const call = await callDomain.startCall(userId, input);
      await callDomain.join(call.id, userId);
      const token = await mintLivekitToken(userId, userId, call.id);
      return { ok: true, data: { call, token } };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async joinCall(userId: string, callId: string): Promise<CallResult<CallJoinResult>> {
    try {
      await callGuards.guardCall(userId, callId);
      const call = await callDomain.join(callId, userId);
      const token = await mintLivekitToken(userId, userId, call.id);
      return { ok: true, data: { call, token } };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async leaveCall(userId: string, callId: string): Promise<CallResult<{ callId: string }>> {
    try {
      await callGuards.guardCall(userId, callId);
      await callDomain.leave(callId, userId);
      return { ok: true, data: { callId } };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  /** Só quem iniciou a chamada pode encerrar pra todo mundo — regra desta ação, não de membership. */
  async endCall(userId: string, callId: string): Promise<CallResult<{ callId: string }>> {
    try {
      const call = await callDomain.findById(callId);
      if (!call) return { ok: false, error: "Chamada não encontrada" };
      if (call.startedBy !== userId) return { ok: false, error: "Só quem iniciou pode encerrar para todos" };

      // A room pode nunca ter sido criada no LiveKit (ninguém chegou a conectar) — ignora esse caso.
      await livekitRoomService.deleteRoom(callId).catch(() => {});
      await callDomain.end(callId, userId);
      return { ok: true, data: { callId } };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async activeCalls(userId: string, workspaceId: string): Promise<CallDTO[]> {
    await callGuards.guardWorkspace(userId, workspaceId);
    return callDomain.activeForWorkspace(workspaceId);
  }
}

export function createCallService(): CallService {
  return new CallService();
}
