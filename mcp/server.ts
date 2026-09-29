import "./silence-stdout";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Server as IOServer } from "socket.io";
import { prisma } from "@/core/db";
import { initEventDispatcher } from "@/server/event-dispatcher";
import { initKanbanChatIntegration } from "@/server/kanban-chat";
import { registerKernoTools } from "@/server/mcp/tools";

/**
 * Servidor MCP pessoal do Kerno (stdio) — expõe workspaces e kanban ao Claude.
 *
 * Roda num processo próprio, falando direto com o banco pelos mesmos serviços do
 * app (`@/server/container`), sempre "como" o usuário de `KERNO_USER_EMAIL`: as
 * checagens de membership/papel do app valem igual — um VIEWER continua sem
 * poder escrever, um workspace alheio continua invisível.
 *
 * Uso: `node --import tsx --env-file=.env mcp/server.ts` (ver README.md, seção MCP).
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function fail(message: string): never {
  console.error(`[kerno-mcp] ${message}`);
  process.exit(1);
}

/** Trava de segurança: sem opt-in explícito, só aceita banco local. */
function assertDatabaseAllowed(): string {
  const url = process.env.DATABASE_URL;
  if (!url) fail("DATABASE_URL não definida (use --env-file=.env).");

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return fail("DATABASE_URL inválida.");
  }

  if (!LOCAL_HOSTS.has(host) && process.env.KERNO_MCP_ALLOW_REMOTE !== "1") {
    fail(`DATABASE_URL aponta para "${host}", que não é local. Defina KERNO_MCP_ALLOW_REMOTE=1 para permitir.`);
  }
  return host;
}

async function main() {
  const dbHost = assertDatabaseAllowed();

  const email = process.env.KERNO_USER_EMAIL?.trim().toLowerCase();
  if (!email) fail("KERNO_USER_EMAIL não definida — informe o e-mail da conta do Kerno que o MCP vai usar.");

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) fail(`Nenhum usuário do Kerno com o e-mail ${email} (banco: ${dbHost}).`);

  // Mesmo pós-processamento do app (auditoria em `Event`, notificações, anúncio
  // Kanban→Chat), mas sem Socket.io: este processo não tem clientes conectados,
  // então o `io` é um no-op. Quem está com o app aberto vê a mudança ao recarregar.
  const noopIo = { to: () => ({ emit: () => true }) } as unknown as IOServer;
  initEventDispatcher(noopIo);
  initKanbanChatIntegration();

  const server = new McpServer({ name: "kerno", version: "0.1.0" });
  registerKernoTools(server, user.id);

  await server.connect(new StdioServerTransport());
  console.error(`[kerno-mcp] pronto — agindo como ${user.name} <${email}> (banco: ${dbHost})`);
}

main().catch((err) => fail(err instanceof Error ? (err.stack ?? err.message) : String(err)));
