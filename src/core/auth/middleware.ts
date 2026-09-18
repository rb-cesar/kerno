import { createMiddleware } from "hono/factory";
import { Forbidden } from "../errors";
import { userIdFromCookieHeader } from "./session";

export type AuthEnv = { Variables: { userId: string } };

/** Exige sessão NextAuth válida (mesmo cookie do app) — injeta `userId` no contexto. */
export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  const userId = await userIdFromCookieHeader(c.req.header("cookie"));
  if (!userId) throw new Forbidden("Sessão inválida");
  c.set("userId", userId);
  await next();
});
