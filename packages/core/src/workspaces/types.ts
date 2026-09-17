// Contratos do domínio núcleo: workspace / membro. O workspace é o único nível
// de contexto (a camada Project foi removida): ele é dono de boards, canais e
// membros.

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

// CreateWorkspaceInput e InviteMemberInput (entradas validadas na fronteira
// HTTP) vivem em ./workspace.dto — derivadas do schema zod, não redeclaradas
// aqui.

/** Envelope genérico de resultado de ação (mutações com erro de negócio). */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
