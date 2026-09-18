// @/modules/kanban/server — lado servidor do módulo Kanban: controller Hono +
// serviço. Superfície pública consumida pela composição do app (server/container.ts).
export { createKanbanController } from "./controller";
export { createKanbanService, type KanbanService } from "./service";
