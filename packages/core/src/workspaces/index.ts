// @kerno/core/workspaces — domínio do núcleo (workspace / membro): autorização
// de membership, serviço (regras + acesso a dados) e controller Hono. Workspace
// é "core" (não uma feature) — vive aqui no "pai", não num módulo.

export * from "./permissions";
export { WorkspaceService, createWorkspaceService, type WorkspaceRole } from "./workspace.service";
export { createWorkspaceController } from "./workspace.controller";
