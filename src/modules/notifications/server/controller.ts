import { Hono } from "hono";
import { type AuthEnv, requireUser } from "@/core/auth/middleware";
import type { NotificationService } from "./service";

export function createNotificationController(notifications: NotificationService) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireUser);

  app.get("/", async (c) => {
    const before = c.req.query("before");
    return c.json(await notifications.listForUser(c.get("userId"), before ? new Date(before) : undefined));
  });

  app.post("/:id/read", async (c) => {
    await notifications.markRead(c.get("userId"), c.req.param("id"));
    return c.json({ ok: true });
  });

  app.post("/read-all", async (c) => {
    await notifications.markAllRead(c.get("userId"));
    return c.json({ ok: true });
  });

  return app;
}
