import { zValidator } from "@hono/zod-validator";
import { type AuthEnv, requireUser } from "@kerno/core/http";
import { Hono } from "hono";
import {
  createChannelInputSchema,
  editMessageInputSchema,
  openDirectInputSchema,
  sendDirectMessageInputSchema,
  sendMessageInputSchema,
  toggleReactionInputSchema,
} from "../chat.dto";
import type { ChatService } from "./chat.service";

export function createChatController(chat: ChatService) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireUser);

  /** Carga inicial: canais + membros + mensagens do 1º canal. */
  app.get("/workspaces/:workspaceId", async (c) =>
    c.json(await chat.chatForWorkspace(c.get("userId"), c.req.param("workspaceId"))),
  );

  app.get("/channels/:channelId/messages", async (c) =>
    c.json(await chat.fetchMessages(c.get("userId"), c.req.param("channelId"))),
  );

  app.post("/messages", zValidator("json", sendMessageInputSchema), async (c) =>
    c.json(await chat.sendMessage(c.get("userId"), c.req.valid("json"))),
  );

  app.post("/messages/edit", zValidator("json", editMessageInputSchema), async (c) =>
    c.json(await chat.editMessage(c.get("userId"), c.req.valid("json"))),
  );

  app.post("/channels", zValidator("json", createChannelInputSchema), async (c) =>
    c.json(await chat.createChannel(c.get("userId"), c.req.valid("json"))),
  );

  app.post("/reactions", zValidator("json", toggleReactionInputSchema), async (c) =>
    c.json(await chat.toggleReaction(c.get("userId"), c.req.valid("json"))),
  );

  // ── Mensagens diretas (DM) ────────────────────────────────────────────────

  /** Abre (ou recupera) a conversa privada com outro membro. */
  app.post("/direct", zValidator("json", openDirectInputSchema), async (c) =>
    c.json(await chat.openDirect(c.get("userId"), c.req.valid("json"))),
  );

  app.get("/direct/:conversationId/messages", async (c) =>
    c.json(await chat.directMessages(c.get("userId"), c.req.param("conversationId"))),
  );

  app.post("/direct/messages", zValidator("json", sendDirectMessageInputSchema), async (c) =>
    c.json(await chat.sendDirect(c.get("userId"), c.req.valid("json"))),
  );

  return app;
}
