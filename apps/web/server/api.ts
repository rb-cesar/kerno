import { createChatController } from "@kerno/chat/server";
import { createWorkspaceController } from "@kerno/core/workspaces";
import { createKanbanController } from "@kerno/kanban/server";
import { Hono } from "hono";
import { container } from "./container";

/**
 * Monta a API HTTP (Hono) do app — chamada pelo route handler do Next
 * (app/api/[[...route]]/route.ts) e usada por todo componente client. Mesma
 * origem que o Next: sem CORS, sem JWT próprio — a sessão é o cookie do
 * NextAuth (ver @kerno/core/http).
 */
export function createApi() {
  const app = new Hono().basePath("/api");

  // Tradução de erro de domínio → HTTP, num lugar só. Quem lança não sabe o
  // que é HTTP (ver @kerno/core/errors).
  app.onError((err, c) => {
    // Checagem por `name` (string), não `instanceof`: pacotes cruzando a
    // fronteira workspace (@kerno/kanban → @kerno/core, via symlink do pnpm)
    // podem resolver @kerno/core/errors como um módulo fisicamente distinto do
    // que um import relativo dentro do próprio @kerno/core resolve — mesmo
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

  return app;
}
