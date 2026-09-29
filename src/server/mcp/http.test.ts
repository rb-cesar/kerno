import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/core/db";
import { container } from "@/server/container";
import { createMcpController } from "./http";

// O cliente MCP real (mesmo protocolo do Claude Code) falando com o handler Hono em
// memória: handshake initialize, tools/list e tools/call, sem subir servidor HTTP.

const suffix = Math.random().toString(36).slice(2, 8);
const TOKEN = `t${"x".repeat(40)}-${suffix}`; // ≥ 32 caracteres
const app = createMcpController();
const URL_ = "http://localhost/";

let userId: string, workspaceId: string, slug: string;
const saved = { token: process.env.KERNO_MCP_TOKEN, email: process.env.KERNO_MCP_USER_EMAIL };

const email = `mcp-http-${suffix}@example.com`;

const post = (headers: Record<string, string> = {}) =>
  app.request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });

async function connectClient(token: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(URL_), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
    fetch: async (input, init) => app.request(input as string | URL, init),
  });
  const client = new Client({ name: "test", version: "0" });
  await client.connect(transport);
  return client;
}

beforeAll(async () => {
  const user = await prisma.user.create({ data: { name: "mcp-http", email, passwordHash: "x" } });
  userId = user.id;
  ({ slug } = await container.workspaces.createWorkspace(userId, { name: `MCP HTTP ${suffix}` }));
  workspaceId = (await prisma.workspace.findUniqueOrThrow({ where: { slug } })).id;
});

afterAll(async () => {
  process.env.KERNO_MCP_TOKEN = saved.token;
  process.env.KERNO_MCP_USER_EMAIL = saved.email;
  if (saved.token === undefined) delete process.env.KERNO_MCP_TOKEN;
  if (saved.email === undefined) delete process.env.KERNO_MCP_USER_EMAIL;
  await prisma.workspace.delete({ where: { id: workspaceId } });
  await prisma.user.delete({ where: { id: userId } });
});

describe("endpoint MCP (HTTP)", () => {
  it("sem as envs, a rota não existe (404)", async () => {
    delete process.env.KERNO_MCP_TOKEN;
    delete process.env.KERNO_MCP_USER_EMAIL;
    expect((await post({ authorization: `Bearer ${TOKEN}` })).status).toBe(404);
  });

  it("token curto demais desliga o endpoint (404)", async () => {
    process.env.KERNO_MCP_TOKEN = "curto";
    process.env.KERNO_MCP_USER_EMAIL = email;
    expect((await post({ authorization: "Bearer curto" })).status).toBe(404);
  });

  it("recusa token ausente ou errado (401)", async () => {
    process.env.KERNO_MCP_TOKEN = TOKEN;
    process.env.KERNO_MCP_USER_EMAIL = email;

    const missing = await post();
    expect(missing.status).toBe(401);
    expect(missing.headers.get("www-authenticate")).toBe("Bearer");

    expect((await post({ authorization: `Bearer ${TOKEN}x` })).status).toBe(401);
    expect((await post({ authorization: `Basic ${TOKEN}` })).status).toBe(401);
  });

  it("cliente MCP real: handshake, lista tools e age como o usuário configurado", async () => {
    process.env.KERNO_MCP_TOKEN = TOKEN;
    process.env.KERNO_MCP_USER_EMAIL = email.toUpperCase(); // e-mail é normalizado

    const client = await connectClient(TOKEN);
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).toEqual(
        expect.arrayContaining(["list_workspaces", "create_card", "send_message"]),
      );

      const res = (await client.callTool({ name: "list_workspaces", arguments: {} })) as {
        content: { text: string }[];
      };
      const mine = JSON.parse(res.content[0]?.text ?? "[]") as { slug: string }[];
      expect(mine.map((w) => w.slug)).toEqual([slug]);
    } finally {
      await client.close();
    }
  });

  it("escrita passa pelo mesmo caminho do app (cria card e lê de volta)", async () => {
    process.env.KERNO_MCP_TOKEN = TOKEN;
    process.env.KERNO_MCP_USER_EMAIL = email;

    const client = await connectClient(TOKEN);
    try {
      const call = async (name: string, args: Record<string, unknown>) =>
        JSON.parse(
          ((await client.callTool({ name, arguments: args })) as { content: { text: string }[] }).content[0]?.text ??
            "",
        );
      const board = await call("get_board", { workspace: slug });
      const created = await call("create_card", { column_id: board.columns[0].id, title: "via http" });
      expect(created.title).toBe("via http");
      expect((await call("get_card", { card: created.ref, workspace: slug })).title).toBe("via http");
    } finally {
      await client.close();
    }
  });

  it("GET não abre stream (stateless → 405)", async () => {
    process.env.KERNO_MCP_TOKEN = TOKEN;
    process.env.KERNO_MCP_USER_EMAIL = email;
    const res = await app.request(URL_, {
      method: "GET",
      headers: { accept: "text/event-stream", authorization: `Bearer ${TOKEN}` },
    });
    expect(res.status).toBe(405);
  });

  it("e-mail configurado sem usuário correspondente → 500", async () => {
    process.env.KERNO_MCP_TOKEN = TOKEN;
    process.env.KERNO_MCP_USER_EMAIL = `ninguem-${suffix}@example.com`;
    expect((await post({ authorization: `Bearer ${TOKEN}` })).status).toBe(500);
  });
});
