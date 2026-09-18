import { createChatService } from "@/modules/chat/server";
import { createKanbanService } from "@/modules/kanban/server";
import { createNotificationService } from "@/modules/notifications/server";
import { createWorkspaceService } from "@/modules/workspaces/server";

/**
 * Composição do app: o único arquivo que conhece mais de um módulo ao mesmo
 * tempo. Instancia os serviços (funções puras por trás, sem estado próprio —
 * o "container" aqui é só conveniência de wiring) e os expõe tanto para as
 * rotas HTTP (server/api.ts) quanto para Server Components/actions, que podem
 * chamá-los direto, sem passar por HTTP.
 *
 * Cache em `globalThis` para sobreviver ao hot-reload do dev (mesmo padrão do
 * event bus em @/core/events).
 */
function build() {
  return {
    workspaces: createWorkspaceService(),
    kanban: createKanbanService(),
    chat: createChatService(),
    notifications: createNotificationService(),
  };
}

const globalForContainer = globalThis as unknown as { kernoContainer?: ReturnType<typeof build> };
export const container = globalForContainer.kernoContainer ?? build();
globalForContainer.kernoContainer = container;
