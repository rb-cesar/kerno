import { createHash, timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { prisma } from "@/core/db";
import { registerKernoTools } from "./tools";

/**
 * Endpoint MCP pessoal (Streamable HTTP) — `POST /api/mcp`. Deixa o Claude ler e
 * escrever nos workspaces do Kerno em produção, rodando as tools DENTRO do servidor
 * do app: mesmos serviços, mesmas permissões, e o event bus in-process alimenta o
 * Socket.io normalmente (realtime, notificações e anúncio Kanban→Chat funcionam).
 *
 * Opt-in e single-user: só existe se `KERNO_MCP_TOKEN` (≥ 32 caracteres) e
 * `KERNO_MCP_USER_EMAIL` estiverem definidas — sem elas, responde 404 como se a rota
 * não existisse. O token é um segredo compartilhado; quem o tem age como aquele
 * usuário (com as permissões dele), então trate como uma senha. Para revogar, remova
 * ou troque a env. Não usa o cookie do NextAuth — é outra porta de entrada, por isso
 * fica fora do `requireUser`.
 */

const MIN_TOKEN_LENGTH = 32;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Comparação em tempo constante (hash dos dois lados → mesmo tamanho, sem vazar o comprimento do token). */
function bearerMatches(authorization: string | undefined, expected: string): boolean {
  const presented = /^Bearer\s+(\S+)$/i.exec(authorization ?? "")?.[1];
  if (!presented) return false;
  return timingSafeEqual(digest(presented), digest(expected));
}

export function createMcpController() {
  const app = new Hono();

  app.all("/", async (c) => {
    const token = process.env.KERNO_MCP_TOKEN;
    const email = process.env.KERNO_MCP_USER_EMAIL?.trim().toLowerCase();
    if (!token || token.length < MIN_TOKEN_LENGTH || !email) return c.json({ error: "Não encontrado" }, 404);

    if (!bearerMatches(c.req.header("authorization"), token)) {
      return c.json({ error: "Não autorizado" }, 401, { "WWW-Authenticate": "Bearer" });
    }

    // Sem sessão nem SSE: só POST. (O SDK, em modo stateless, abriria um stream no GET.)
    if (c.req.method !== "POST") return c.json({ error: "Método não permitido" }, 405, { Allow: "POST" });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      console.error("[mcp] KERNO_MCP_USER_EMAIL não corresponde a nenhum usuário");
      return c.json({ error: "Usuário do MCP não encontrado" }, 500);
    }

    // Stateless: um servidor + transporte por requisição (o SDK não permite reusar um
    // transporte stateless entre requisições) e resposta JSON simples, sem SSE.
    const server = new McpServer({ name: "kerno", version: "0.1.0" });
    registerKernoTools(server, user.id);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(c.req.raw);
    } finally {
      await server.close();
    }
  });

  return app;
}
