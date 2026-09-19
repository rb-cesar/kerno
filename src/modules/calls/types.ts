// Contratos do Hub Calls — DTOs e os tipos de wiring da camada de entrega
// (client injetado pelo app), mesmo formato do Hub Chat.

export type { StartCallInput } from "./dto";

/** Espelha o enum CallStatus do schema. */
export type CallStatus = "RINGING" | "ACTIVE" | "ENDED";

export interface CallDTO {
  id: string;
  workspaceId: string;
  channelId: string | null;
  conversationId: string | null;
  startedBy: string;
  status: CallStatus;
  startedAt: string; // ISO
  endedAt: string | null; // ISO
}

export interface CallJoinResult {
  call: CallDTO;
  token: string;
}

export type CallResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ── Wiring da camada de entrega (client injetado pelo app) ──────────────────

export type CallsStartCall = (target: {
  channelId?: string;
  conversationId?: string;
}) => Promise<CallResult<CallJoinResult>>;
export type CallsJoinCall = (callId: string) => Promise<CallResult<CallJoinResult>>;
export type CallsLeaveCall = (callId: string) => Promise<CallResult<{ callId: string }>>;
export type CallsEndCall = (callId: string) => Promise<CallResult<{ callId: string }>>;
export type CallsFetchActive = (workspaceId: string) => Promise<CallDTO[]>;
