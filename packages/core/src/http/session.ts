import { getToken } from "next-auth/jwt";

// Cookie seguro (`__Secure-authjs.session-token`) só faz sentido sob https —
// mesma regra que o NextAuth usa para decidir o prefixo do cookie que emite.
const secureCookie = (process.env.AUTH_URL ?? "").startsWith("https://");

/**
 * Extrai o userId da sessão NextAuth a partir do cabeçalho `Cookie` — usado
 * tanto pelo middleware Hono (`c.req.header("cookie")`) quanto pelo handshake
 * do socket (`socket.handshake.headers.cookie`). Mesma sessão, uma única fonte
 * — nada de JWT próprio, nada de BFF.
 */
export async function userIdFromCookieHeader(cookieHeader: string | undefined): Promise<string | null> {
  const token = await getToken({
    req: { headers: { cookie: cookieHeader ?? "" } },
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });
  return typeof token?.id === "string" ? token.id : null;
}
