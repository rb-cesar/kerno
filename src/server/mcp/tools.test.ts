import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/core/db";
import { container } from "@/server/container";
import { registerKernoTools } from "./tools";

// Integração de ponta a ponta: cliente MCP ↔ servidor MCP (em memória) ↔ serviços
// reais ↔ Postgres local — mesmo estilo dos testes de service do app.

const suffix = Math.random().toString(36).slice(2, 8);
let adminId: string, viewerId: string, outsiderId: string, workspaceId: string;
let slug: string;
let key: string;

const clients: Client[] = [];

async function connect(userId: string): Promise<Client> {
  const server = new McpServer({ name: "kerno-test", version: "0" });
  registerKernoTools(server, userId);
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  clients.push(client);
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const res = (await client.callTool({ name, arguments: args })) as {
    isError?: boolean;
    content: { type: string; text: string }[];
  };
  const text = res.content[0]?.text ?? "";
  return { isError: res.isError === true, text, json: () => JSON.parse(text) };
}

let admin: Client, viewer: Client, outsider: Client;

beforeAll(async () => {
  const mk = (tag: string) =>
    prisma.user.create({ data: { name: `mcp-${tag}`, email: `mcp-${tag}-${suffix}@example.com`, passwordHash: "x" } });
  const [a, v, o] = await Promise.all([mk("admin"), mk("viewer"), mk("outsider")]);
  adminId = a.id;
  viewerId = v.id;
  outsiderId = o.id;

  ({ slug } = await container.workspaces.createWorkspace(adminId, { name: `MCP Test ${suffix}` }));
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { slug } });
  workspaceId = workspace.id;
  key = workspace.key;
  await prisma.workspaceUser.create({ data: { userId: viewerId, workspaceId, role: "VIEWER" } });

  [admin, viewer, outsider] = await Promise.all([connect(adminId), connect(viewerId), connect(outsiderId)]);
});

afterAll(async () => {
  await Promise.all(clients.map((c) => c.close()));
  await prisma.workspace.delete({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, viewerId, outsiderId] } } });
});

describe("kerno MCP tools", () => {
  it("expõe as tools com schema JSON válido", async () => {
    const { tools } = await admin.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of [
      "list_workspaces",
      "get_board",
      "create_card",
      "update_card",
      "move_card",
      "kanban_command",
    ]) {
      expect(names).toContain(expected);
    }
    for (const t of tools) expect(t.inputSchema.type).toBe("object");
  });

  it("list_workspaces mostra só os workspaces do usuário", async () => {
    const mine = (await call(admin, "list_workspaces")).json() as { slug: string }[];
    expect(mine.map((w) => w.slug)).toContain(slug);
    const theirs = (await call(outsider, "list_workspaces")).json() as { slug: string }[];
    expect(theirs.map((w) => w.slug)).not.toContain(slug);
  });

  it("bloqueia quem não é membro", async () => {
    const res = await call(outsider, "get_board", { workspace: slug });
    expect(res.isError).toBe(true);
  });

  it("cria, lê por referência KEY-N, edita parcialmente e comenta", async () => {
    const board = (await call(admin, "get_board", { workspace: slug })).json();
    expect(board.columns.map((c: { name: string }) => c.name)).toEqual([
      "Backlog",
      "A fazer",
      "Em progresso",
      "Concluído",
      "Cancelado",
    ]);
    const backlog = board.columns[0].id as string;

    const created = (
      await call(admin, "create_card", { column_id: backlog, title: "  Primeiro  ", priority: "HIGH" })
    ).json();
    expect(created.ref).toBe(`${key}-1`);
    expect(created.title).toBe("Primeiro");

    await call(admin, "update_card", { card: created.ref, workspace: slug, description: "detalhes" });
    await call(admin, "update_card", { card: created.id, due_date: "2026-12-31", estimate: 3 });
    await call(admin, "add_comment", { card: created.ref, workspace: slug, body: "olá" });

    const card = (await call(admin, "get_card", { card: created.ref, workspace: slug })).json();
    expect(card).toMatchObject({
      title: "Primeiro",
      description: "detalhes",
      priority: "HIGH", // não foi sobrescrita pelos updates parciais
      dueDate: "2026-12-31",
      estimate: 3,
      column: { name: "Backlog" },
    });
    expect(card.comments.map((c: { body: string }) => c.body)).toEqual(["olá"]);

    // `null` limpa; omitir mantém.
    await call(admin, "update_card", { card: created.id, description: null });
    expect((await call(admin, "get_card", { card: created.id })).json().description).toBeNull();
  });

  it("move_card muda de coluna por nome e reordena por posição", async () => {
    const board = (await call(admin, "get_board", { workspace: slug })).json();
    const backlog = board.columns[0].id as string;

    const ids: string[] = [];
    for (const title of ["A", "B", "C"]) {
      ids.push((await call(admin, "create_card", { column_id: backlog, title })).json().id);
    }

    // C para o topo do próprio backlog.
    expect((await call(admin, "move_card", { card: ids[2], to_column: "backlog", position: 0 })).isError).toBe(false);
    // B para "Em progresso".
    expect((await call(admin, "move_card", { card: ids[1], to_column: "Em progresso" })).isError).toBe(false);

    const after = (await call(admin, "get_board", { workspace: slug })).json();
    const titlesIn = (name: string) =>
      after.columns.find((c: { name: string }) => c.name === name).cards.map((c: { title: string }) => c.title);
    expect(titlesIn("Backlog")).toEqual(["C", "Primeiro", "A"]);
    expect(titlesIn("Em progresso")).toEqual(["B"]);

    const bad = await call(admin, "move_card", { card: ids[0], to_column: "não existe" });
    expect(bad.isError).toBe(true);
    expect(bad.text).toContain("Colunas:");
  });

  it("ref KEY-N sem workspace é rejeitada com mensagem clara", async () => {
    const res = await call(admin, "get_card", { card: `${key}-1` });
    expect(res.isError).toBe(true);
    expect(res.text).toContain("workspace");
  });

  it("VIEWER lê mas não escreve", async () => {
    const board = (await call(viewer, "get_board", { workspace: slug })).json();
    expect(board.columns).toHaveLength(5);
    const res = await call(viewer, "create_card", { column_id: board.columns[0].id, title: "nope" });
    expect(res.isError).toBe(true);
  });

  it("rejeita responsável que não é membro do workspace", async () => {
    const board = (await call(admin, "get_board", { workspace: slug })).json();
    const res = await call(admin, "create_card", {
      column_id: board.columns[0].id,
      title: "com responsável",
      assignee_id: outsiderId,
    });
    expect(res.isError).toBe(true);
    expect(res.text).toContain("membro");
  });

  it("kanban_command cobre o resto do kanban (label) e devolve erro de validação", async () => {
    const board = (await call(admin, "get_board", { workspace: slug })).json();
    const ok = await call(admin, "kanban_command", {
      command: { type: "createLabel", boardId: board.id, name: "bug", color: "#f00" },
    });
    expect(ok.isError).toBe(false);
    const after = (await call(admin, "get_board", { workspace: slug })).json();
    expect(after.labels.map((l: { name: string }) => l.name)).toContain("bug");

    const invalid = await call(admin, "kanban_command", { command: { type: "nao-existe" } });
    expect(invalid.isError).toBe(true);
  });

  it("delete_card remove o card", async () => {
    const board = (await call(admin, "get_board", { workspace: slug })).json();
    const created = (await call(admin, "create_card", { column_id: board.columns[4].id, title: "efêmero" })).json();
    expect((await call(admin, "delete_card", { card: created.id })).isError).toBe(false);
    expect((await call(admin, "get_card", { card: created.id })).isError).toBe(true);
  });
});

describe("kerno MCP chat tools", () => {
  it("lista o canal padrão e barra quem não é membro", async () => {
    const data = (await call(admin, "list_channels", { workspace: slug })).json();
    expect(data.channels.map((c: { name: string }) => c.name)).toEqual(["geral"]);
    expect(data.members).toHaveLength(2);
    expect((await call(outsider, "list_channels", { workspace: slug })).isError).toBe(true);
  });

  it("envia, responde, edita, reage e lê em ordem cronológica", async () => {
    const { channels } = (await call(admin, "list_channels", { workspace: slug })).json();
    const channelId = channels[0].id as string;

    const first = (await call(admin, "send_message", { channel_id: channelId, content: "  olá  " })).json();
    expect(first.content).toBe("olá");
    const reply = (
      await call(admin, "send_message", { channel_id: channelId, content: "resposta", reply_to_id: first.id })
    ).json();
    expect(reply.replyToId).toBe(first.id);

    expect((await call(admin, "edit_message", { message_id: first.id, content: "olá, mundo" })).json().edited).toBe(
      true,
    );
    expect((await call(admin, "react_to_message", { message_id: first.id, emoji: "👍" })).isError).toBe(false);

    const page = (await call(admin, "read_channel_messages", { channel_id: channelId })).json();
    expect(page.hasMore).toBe(false);
    expect(page.messages.map((m: { content: string }) => m.content)).toEqual(["olá, mundo", "resposta"]);
    expect(page.messages[0].reactions).toEqual(["👍×1 (você)"]);
  });

  it("VIEWER lê o canal mas não escreve; editar mensagem alheia é recusado", async () => {
    const { channels } = (await call(viewer, "list_channels", { workspace: slug })).json();
    const channelId = channels[0].id as string;
    const msgs = (await call(viewer, "read_channel_messages", { channel_id: channelId })).json().messages;
    expect(msgs.length).toBeGreaterThan(0);

    expect((await call(viewer, "send_message", { channel_id: channelId, content: "não" })).isError).toBe(true);
    expect((await call(viewer, "edit_message", { message_id: msgs[0].id, content: "hack" })).isError).toBe(true);
  });

  it("DM: só os participantes leem e escrevem", async () => {
    const dm = (await call(admin, "open_direct", { workspace: slug, user_id: viewerId })).json();
    expect(dm.participants.map((p: { id: string }) => p.id)).toEqual([viewerId]);

    const sent = await call(admin, "send_direct_message", { conversation_id: dm.id, content: "segredo" });
    expect(sent.isError).toBe(false);

    const seenByViewer = (await call(viewer, "read_direct_messages", { conversation_id: dm.id })).json();
    expect(seenByViewer.messages.map((m: { content: string }) => m.content)).toEqual(["segredo"]);

    expect((await call(outsider, "read_direct_messages", { conversation_id: dm.id })).isError).toBe(true);
    expect((await call(outsider, "send_direct_message", { conversation_id: dm.id, content: "x" })).isError).toBe(true);
  });

  it("cria canal (nome normalizado)", async () => {
    const created = (await call(admin, "create_channel", { workspace: slug, name: "Time Backend" })).json();
    expect(created.name).toBe("time-backend");
  });
});
