// @kerno/core/http — a sessão NextAuth (cookie) traduzida para o mundo Hono.
// Usado tanto pelo app (montagem da API, handshake do socket) quanto pelos
// controllers dos módulos (guard de rota).
export { userIdFromCookieHeader } from "./session";
export { requireUser, type AuthEnv } from "./auth-middleware";
