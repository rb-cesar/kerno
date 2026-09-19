import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type AuthEnv, requireUser } from "@/core/auth/middleware";
import { kanbanCommandSchema } from "../dto";
import type { KanbanService } from "./service";

export function createKanbanController(kanban: KanbanService) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireUser);

  /** Board padrão do workspace — carga inicial da tela. */
  app.get("/workspaces/:workspaceId/board", async (c) =>
    c.json(await kanban.boardForWorkspace(c.get("userId"), c.req.param("workspaceId"))),
  );

  /** Snapshot de um board — refetch após eventos. */
  app.get("/boards/:boardId", async (c) => c.json(await kanban.snapshot(c.get("userId"), c.req.param("boardId"))));

  /** Busca tarefas do workspace por KERN-N/título — menção `!` no chat. */
  app.get("/workspaces/:workspaceId/cards/search", async (c) =>
    c.json(await kanban.searchCards(c.get("userId"), c.req.param("workspaceId"), c.req.query("q") ?? "")),
  );

  /** Próxima página de cards de uma coluna — "carregar mais" no board. */
  app.get("/columns/:columnId/cards", async (c) =>
    c.json(await kanban.columnCards(c.get("userId"), c.req.param("columnId"), c.req.query("after"))),
  );

  /** Detalhe de um card (sub-tarefas, comentários, atividade) — sob demanda. */
  app.get("/cards/:cardId/detail", async (c) =>
    c.json(await kanban.cardDetail(c.get("userId"), c.req.param("cardId"))),
  );

  /** Snapshot do board que contém um card — painel da tarefa aberto pelo chat. */
  app.get("/cards/:cardId/board", async (c) => c.json(await kanban.cardBoard(c.get("userId"), c.req.param("cardId"))));

  /** Métricas de fluxo do board. */
  app.get("/boards/:boardId/metrics", async (c) =>
    c.json(await kanban.metrics(c.get("userId"), c.req.param("boardId"))),
  );

  /** Mutação única (command pattern). Retorna KanbanMutationResult. */
  app.post("/commands", zValidator("json", kanbanCommandSchema), async (c) =>
    c.json(await kanban.runCommand(c.get("userId"), c.req.valid("json"))),
  );

  return app;
}
