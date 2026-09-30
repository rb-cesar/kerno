import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ChatResult, MessageDTO } from "@/modules/chat/types";
import { container } from "@/server/container";
import { READ, run, WRITE, workspaceSlug } from "./common";

const { workspaces, chat } = container;

/** Mensagem enxuta p/ o contexto do modelo (o DTO cru repete campos que só a UI usa). */
function compactMessage(m: MessageDTO) {
  return {
    id: m.id,
    at: m.createdAt,
    author: m.isSystem ? "Sistema" : (m.author?.name ?? "?"),
    content: m.content,
    edited: m.editedAt ? true : undefined,
    replyToId: m.replyTo?.id,
    replyTo: m.replyTo ? `${m.replyTo.authorName}: ${m.replyTo.excerpt}` : undefined,
    reactions:
      m.reactions.length > 0 ? m.reactions.map((r) => `${r.emoji}×${r.count}${r.mine ? " (você)" : ""}`) : undefined,
  };
}

/** `ChatService` devolve `{ ok, data } | { ok: false, error }` em vez de lançar — converte para exceção. */
function unwrap<T>(result: ChatResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const AS_USER =
  "A mensagem é enviada em nome do usuário e fica visível para os outros participantes: " +
  "confirme o texto com o usuário antes de enviar.";

export function registerChatTools(server: McpServer, userId: string): void {
  // ── Leitura ───────────────────────────────────────────────────────────────

  server.registerTool(
    "list_channels",
    {
      title: "Listar canais e conversas",
      description:
        "Canais do workspace (id, nome, se é o padrão) e as conversas diretas (DM) de que o usuário participa, " +
        "com os outros participantes. Os ids servem para read_channel_messages / send_message / send_direct_message.",
      inputSchema: { workspace: workspaceSlug },
      annotations: READ,
    },
    ({ workspace }) =>
      run(async () => {
        const ws = await workspaces.getBySlug(userId, workspace);
        const data = await chat.chatForWorkspace(userId, ws.id);
        return { channels: data.channels, conversations: data.conversations, members: data.members };
      }),
  );

  server.registerTool(
    "read_channel_messages",
    {
      title: "Ler mensagens de um canal",
      description:
        "Últimas 50 mensagens do canal, em ordem cronológica. Para mensagens mais antigas, passe em `before_id` " +
        "o id da mais antiga já lida (enquanto `hasMore` for true).",
      inputSchema: {
        channel_id: z.string().min(1),
        before_id: z.string().optional().describe("Cursor: id da mensagem mais antiga já carregada"),
      },
      annotations: READ,
    },
    ({ channel_id, before_id }) =>
      run(async () => {
        const page = await chat.fetchMessages(userId, channel_id, before_id);
        return { hasMore: page.hasMore, messages: page.items.map(compactMessage) };
      }),
  );

  server.registerTool(
    "read_direct_messages",
    {
      title: "Ler mensagens de uma DM",
      description:
        "Últimas 50 mensagens de uma conversa direta (só participantes leem). Paginação igual a read_channel_messages.",
      inputSchema: {
        conversation_id: z.string().min(1),
        before_id: z.string().optional().describe("Cursor: id da mensagem mais antiga já carregada"),
      },
      annotations: READ,
    },
    ({ conversation_id, before_id }) =>
      run(async () => {
        const page = await chat.directMessages(userId, conversation_id, before_id);
        return { hasMore: page.hasMore, messages: page.items.map(compactMessage) };
      }),
  );

  // ── Escrita ───────────────────────────────────────────────────────────────

  server.registerTool(
    "send_message",
    {
      title: "Enviar mensagem em canal",
      description: `Envia uma mensagem (até 4000 caracteres) num canal. ${AS_USER}`,
      inputSchema: {
        channel_id: z.string().min(1),
        content: z.string().min(1).max(4000),
        reply_to_id: z.string().optional().describe("Id de uma mensagem do mesmo canal a responder"),
      },
      annotations: WRITE,
    },
    ({ channel_id, content, reply_to_id }) =>
      run(async () =>
        compactMessage(
          unwrap(await chat.sendMessage(userId, { channelId: channel_id, content, replyToId: reply_to_id })),
        ),
      ),
  );

  server.registerTool(
    "send_direct_message",
    {
      title: "Enviar mensagem direta",
      description: `Envia uma mensagem (até 4000 caracteres) numa conversa direta já aberta (open_direct). ${AS_USER}`,
      inputSchema: {
        conversation_id: z.string().min(1),
        content: z.string().min(1).max(4000),
        reply_to_id: z.string().optional().describe("Id de uma mensagem da mesma conversa a responder"),
      },
      annotations: WRITE,
    },
    ({ conversation_id, content, reply_to_id }) =>
      run(async () =>
        compactMessage(
          unwrap(await chat.sendDirect(userId, { conversationId: conversation_id, content, replyToId: reply_to_id })),
        ),
      ),
  );

  server.registerTool(
    "open_direct",
    {
      title: "Abrir conversa direta",
      description:
        "Abre (ou recupera) a conversa privada com outro membro do workspace e devolve o id da conversa. " +
        "Não envia nada por si só.",
      inputSchema: {
        workspace: workspaceSlug,
        user_id: z.string().min(1).describe("ID do outro membro (get_workspace → members)"),
      },
      annotations: WRITE,
    },
    ({ workspace, user_id }) =>
      run(async () => {
        const ws = await workspaces.getBySlug(userId, workspace);
        return unwrap(await chat.openDirect(userId, { workspaceId: ws.id, userId: user_id }));
      }),
  );

  server.registerTool(
    "edit_message",
    {
      title: "Editar mensagem",
      description:
        "Edita o texto de uma mensagem do próprio usuário (canal ou DM). Mensagens de sistema e de outros não são editáveis.",
      inputSchema: { message_id: z.string().min(1), content: z.string().min(1).max(4000) },
      annotations: WRITE,
    },
    ({ message_id, content }) =>
      run(async () => compactMessage(unwrap(await chat.editMessage(userId, { messageId: message_id, content })))),
  );

  server.registerTool(
    "react_to_message",
    {
      title: "Reagir a mensagem",
      description: "Alterna a reação do usuário com um emoji numa mensagem: adiciona se não havia, remove se já havia.",
      inputSchema: { message_id: z.string().min(1), emoji: z.string().min(1).max(16) },
      annotations: WRITE,
    },
    ({ message_id, emoji }) =>
      run(async () => {
        unwrap(await chat.toggleReaction(userId, { messageId: message_id, emoji }));
        return `Reação ${emoji} alternada.`;
      }),
  );

  server.registerTool(
    "create_channel",
    {
      title: "Criar canal",
      description: "Cria um canal no workspace (o nome vira minúsculo, com espaços trocados por hífen).",
      inputSchema: { workspace: workspaceSlug, name: z.string().min(1).max(60) },
      annotations: WRITE,
    },
    ({ workspace, name }) =>
      run(async () => {
        const ws = await workspaces.getBySlug(userId, workspace);
        return unwrap(await chat.createChannel(userId, { workspaceId: ws.id, name }));
      }),
  );
}
