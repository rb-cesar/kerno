"use client";

import { request } from "@/core/request";
import type { CallDTO, CallJoinResult, CallResult } from "./types";

// Chamadas HTTP do módulo Calls — mesma origem (/api/calls/...), sem BFF.

function callError(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" };
}

export const callsClient = {
  startCall: (target: { channelId?: string; conversationId?: string }): Promise<CallResult<CallJoinResult>> =>
    request<CallResult<CallJoinResult>>("/calls/start", { method: "POST", body: target }).catch(callError),

  joinCall: (callId: string): Promise<CallResult<CallJoinResult>> =>
    request<CallResult<CallJoinResult>>(`/calls/${callId}/join`, { method: "POST" }).catch(callError),

  leaveCall: (callId: string): Promise<CallResult<{ callId: string }>> =>
    request<CallResult<{ callId: string }>>(`/calls/${callId}/leave`, { method: "POST" }).catch(callError),

  endCall: (callId: string): Promise<CallResult<{ callId: string }>> =>
    request<CallResult<{ callId: string }>>(`/calls/${callId}/end`, { method: "POST" }).catch(callError),

  fetchActive: (workspaceId: string): Promise<CallDTO[]> =>
    request<CallDTO[]>(`/calls/active?workspaceId=${encodeURIComponent(workspaceId)}`).catch(() => []),
};
