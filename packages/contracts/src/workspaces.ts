// Contratos do domínio núcleo: workspace / membro.
// Pacote puro: sem Next, Prisma ou React. Consumível por qualquer app cliente.
//
// O workspace é o único nível de contexto (a camada Project foi removida): ele é
// dono de boards, canais e membros.

import type { MemberDTO } from "./common";

export type { MemberDTO };

export interface WorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
}

export interface WorkspaceMemberDTO {
  id: string;
  name: string;
  role: string;
}

/** Tela de um workspace (membros + papel do usuário atual). */
export interface WorkspaceView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  myRole: string;
  members: WorkspaceMemberDTO[];
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string | null;
}

export interface InviteMemberInput {
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
}

/** Envelope genérico de resultado de ação (mutações com erro de negócio). */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
