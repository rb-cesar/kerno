// @/modules/workspaces/server — controller Hono + serviço. `permissions.ts`
// (requireWorkspaceMember/Admin) é importado direto por kanban e chat — a
// única exceção conhecida à regra "módulo nunca importa módulo": workspace é a
// base de multi-tenancy que todo hub precisa para autorizar seus recursos.
export { createWorkspaceController } from "./controller";
export { createWorkspaceService, type WorkspaceRole, WorkspaceService } from "./service";
