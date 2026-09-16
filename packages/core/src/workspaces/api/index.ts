// @kerno/core/workspaces-api — camada Nest do núcleo workspaces (controller + módulo).
// Workspace é "core" (não uma feature), por isso vive aqui no "pai".

export { WorkspacesModule } from "./workspaces.module";
export { requireWorkspaceMember, requireWorkspaceAdmin } from "./workspaces-permissions";
