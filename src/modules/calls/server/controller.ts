import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type AuthEnv, requireUser } from "@/core/auth/middleware";
import { livekitWebhookReceiver } from "@/core/livekit";
import { startCallInputSchema } from "../dto";
import type { CallService } from "./service";

export function createCallController(calls: CallService) {
  const app = new Hono<AuthEnv>();

  // Webhook do LiveKit: sem cookie de sessão — autenticidade vem da assinatura
  // verificada por WebhookReceiver sobre o corpo raw, não de requireUser. Por
  // isso essa rota fica fora do requireUser aplicado nas demais (não há
  // app.use("*", requireUser) global neste controller).
  app.post("/webhook", async (c) => {
    const rawBody = await c.req.text();
    try {
      const event = await livekitWebhookReceiver.receive(rawBody, c.req.header("Authorization") ?? "");
      console.log("[calls] webhook LiveKit:", event.event, event.room?.name);
    } catch (err) {
      console.error("[calls] webhook LiveKit inválido", err);
    }
    return c.body(null, 200);
  });

  app.post("/start", requireUser, zValidator("json", startCallInputSchema), async (c) =>
    c.json(await calls.startCall(c.get("userId"), c.req.valid("json"))),
  );

  app.post("/:id/join", requireUser, async (c) => c.json(await calls.joinCall(c.get("userId"), c.req.param("id"))));

  app.post("/:id/leave", requireUser, async (c) => c.json(await calls.leaveCall(c.get("userId"), c.req.param("id"))));

  app.post("/:id/end", requireUser, async (c) => c.json(await calls.endCall(c.get("userId"), c.req.param("id"))));

  app.get("/active", requireUser, async (c) =>
    c.json(await calls.activeCalls(c.get("userId"), c.req.query("workspaceId") ?? "")),
  );

  return app;
}
