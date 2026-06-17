// Contratos do domínio núcleo: workspace / projeto / membro.
// Pacote puro: sem Next, Prisma ou React. Consumível por qualquer app cliente.

import type { MemberDTO } from "./common";

export type { MemberDTO };

export interface WorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  projectCount: number;
}

export interface WorkspaceMemberDTO {
  id: string;
  name: string;
  role: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
}

/** Tela de um workspace (projetos + membros). Inclui o papel do usuário atual. */
export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  myRole: string;
  projects: ProjectListItem[];
  members: WorkspaceMemberDTO[];
}

export interface ProjectMemberDTO {
  id: string;
  name: string;
  role: string;
}

/** Snapshot do projeto consumido pelo layout (gate de acesso + cabeçalho). */
export interface ProjectView {
  id: string;
  name: string;
  projectMembers: ProjectMemberDTO[];
  workspaceMembers: MemberDTO[];
  myWorkspaceRole: string | null;
  myProjectRole: string | null;
}

export interface CreateWorkspaceInput {
  name: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
}

export interface InviteMemberInput {
  email: string;
  role: "ADMIN" | "MEMBER";
}

/** Envelope genérico de resultado de ação (mutações com erro de negócio). */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
