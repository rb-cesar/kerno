import { Hono } from "hono";
import type {
  CreateChannelInput,
  EditMessageInput,
  OpenDirectInput,
  SendDirectMessageInput,
  SendMessageInput,
  ToggleReactionInput,
} from "@kerno/contracts/chat";
import { requireUser, type AuthEnv } from "@kerno/core/http";
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

  app.post("/messages", async (c) => {
    const body = await c.req.json<SendMessageInput>();
    return c.json(await chat.sendMessage(c.get("userId"), body));
  });

  app.post("/messages/edit", async (c) => {
    const body = await c.req.json<EditMessageInput>();
    return c.json(await chat.editMessage(c.get("userId"), body));
  });

  app.post("/channels", async (c) => {
    const body = await c.req.json<CreateChannelInput>();
    return c.json(await chat.createChannel(c.get("userId"), body));
  });

  app.post("/reactions", async (c) => {
    const body = await c.req.json<ToggleReactionInput>();
    return c.json(await chat.toggleReaction(c.get("userId"), body));
  });

  // ── Mensagens diretas (DM) ────────────────────────────────────────────────

  /** Abre (ou recupera) a conversa privada com outro membro. */
  app.post("/direct", async (c) => {
    const body = await c.req.json<OpenDirectInput>();
    return c.json(await chat.openDirect(c.get("userId"), body));
  });

  app.get("/direct/:conversationId/messages", async (c) =>
    c.json(await chat.directMessages(c.get("userId"), c.req.param("conversationId"))),
  );

  app.post("/direct/messages", async (c) => {
    const body = await c.req.json<SendDirectMessageInput>();
    return c.json(await chat.sendDirect(c.get("userId"), body));
  });

  return app;
}
