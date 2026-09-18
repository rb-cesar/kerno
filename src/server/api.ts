import { Hono } from "hono";
import { createChatController } from "@/modules/chat/server";
import { createKanbanController } from "@/modules/kanban/server";
import { createNotificationController } from "@/modules/notifications/server";
import { createWorkspaceController } from "@/modules/workspaces/server";
import { container } from "./container";

/**
 * Monta a API HTTP (Hono) do app — chamada pelo route handler do Next
 * (app/api/[[...route]]/route.ts) e usada por todo componente client. Mesma
 * origem que o Next: sem CORS, sem JWT próprio — a sessão é o cookie do
 * NextAuth (ver @/core/auth).
 */
export function createApi() {
  const app = new Hono().basePath("/api");

  // Tradução de erro de domínio → HTTP, num lugar só. Quem lança não sabe o
  // que é HTTP (ver @/core/errors).
  app.onError((err, c) => {
    // Checagem por `name` (string), não `instanceof`: pacotes cruzando a
    // fronteira de módulo (@/modules/kanban → @/core), via layer diferente do Next
    // podem resolver @/core/errors como um módulo fisicamente distinto do
    // que um import relativo dentro do próprio @/core resolve — mesmo
    // arquivo-fonte, duas identidades de classe no bundler do Next em dev.
    // `instanceof` falha nesse caso; `name` (setado no construtor) não.
    if (err.name === "NotFound") return c.json({ error: err.message }, 404);
    if (err.name === "Forbidden") return c.json({ error: err.message }, 403);
    if (err.name === "RuleViolation") return c.json({ error: err.message }, 422);
    console.error(err);
    return c.json({ error: "Erro interno" }, 500);
  });

  app.route("/workspaces", createWorkspaceController(container.workspaces));
  app.route("/kanban", createKanbanController(container.kanban));
  app.route("/chat", createChatController(container.chat));
  app.route("/notifications", createNotificationController(container.notifications));

  return app;
}
