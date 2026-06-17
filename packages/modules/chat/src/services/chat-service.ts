import { prisma } from "@kerno/db";
import { createEvent, eventBus } from "@kerno/core/events";
import type {
  ChannelDTO,
  DirectConversationDTO,
  MemberDTO,
  MessageDTO,
  ReactionDTO,
} from "../types";

const MESSAGE_PAGE_SIZE = 50;

// Include padrão para montar um MessageDTO: autor + a mensagem citada (replyTo).
const MESSAGE_INCLUDE = {
  user: { select: { id: true, name: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      isSystem: true,
      user: { select: { name: true } },
    },
  },
  reactions: { select: { emoji: true, userId: true } },
} as const;

type ReplyRow = {
  id: string;
  content: string;
  isSystem: boolean;
  user: { name: string } | null;
} | null;

type ReactionRow = { emoji: string; userId: string };

type MessageRow = {
  id: string;
  content: string;
  createdAt: Date;
  isSystem: boolean;
  user: { id: string; name: string } | null;
  replyTo?: ReplyRow;
  reactions?: ReactionRow[];
};

function makeExcerpt(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Agrupa reações por emoji, preservando a ordem de 1ª aparição. */
function aggregateReactions(rows: ReactionRow[], viewerId: string): ReactionDTO[] {
  const byEmoji = new Map<string, { count: number; mine: boolean }>();
  for (const r of rows) {
    const entry = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
    entry.count += 1;
    if (r.userId === viewerId) entry.mine = true;
    byEmoji.set(r.emoji, entry);
  }
  return [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
}

function toMessageDTO(row: MessageRow, viewerId: string): MessageDTO {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    isSystem: row.isSystem,
    author: row.user ? { id: row.user.id, name: row.user.name } : null,
    replyTo: row.replyTo
      ? {
          id: row.replyTo.id,
          authorName: row.replyTo.isSystem
            ? "Sistema"
            : (row.replyTo.user?.name ?? "Desconhecido"),
          excerpt: makeExcerpt(row.replyTo.content),
        }
      : null,
    reactions: aggregateReactions(row.reactions ?? [], viewerId),
  };
}

/** Garante que a mensagem citada pertence ao mesmo canal (senão ignora). */
async function replyIdIfInChannel(
  replyToId: string | null | undefined,
  channelId: string,
): Promise<string | null> {
  if (!replyToId) return null;
  const target = await prisma.message.findUnique({
    where: { id: replyToId },
    select: { channelId: true },
  });
  return target?.channelId === channelId ? replyToId : null;
}

/** Garante que a mensagem citada pertence à mesma conversa (senão ignora). */
async function replyIdIfInConversation(
  replyToId: string | null | undefined,
  conversationId: string,
): Promise<string | null> {
  if (!replyToId) return null;
  const target = await prisma.message.findUnique({
    where: { id: replyToId },
    select: { conversationId: true },
  });
  return target?.conversationId === conversationId ? replyToId : null;
}

export async function listChannels(projectId: string): Promise<ChannelDTO[]> {
  const channels = await prisma.channel.findMany({
    where: { projectId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return channels.map((c) => ({ id: c.id, name: c.name, isDefault: c.isDefault }));
}

export async function getMessages(
  channelId: string,
  viewerId: string,
  limit = MESSAGE_PAGE_SIZE,
): Promise<MessageDTO[]> {
  const rows = await prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: MESSAGE_INCLUDE,
  });
  return rows.reverse().map((row) => toMessageDTO(row, viewerId));
}

export async function createChannel(projectId: string, name: string): Promise<ChannelDTO> {
  const channel = await prisma.channel.create({ data: { projectId, name } });
  return { id: channel.id, name: channel.name, isDefault: channel.isDefault };
}

export async function sendMessage(
  channelId: string,
  content: string,
  actorId: string,
  replyToId?: string | null,
): Promise<MessageDTO> {
  const channel = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    select: { projectId: true },
  });

  const message = await prisma.message.create({
    data: {
      channelId,
      content,
      userId: actorId,
      replyToId: await replyIdIfInChannel(replyToId, channelId),
    },
    include: MESSAGE_INCLUDE,
  });

  eventBus.publish(
    createEvent(
      "message:sent",
      channel.projectId,
      { messageId: message.id, channelId, content },
      actorId,
    ),
  );

  return toMessageDTO(message, actorId);
}

/** Mensagem de sistema (sem autor) — usada na integração entre hubs. */
export async function postSystemMessage(channelId: string, content: string): Promise<MessageDTO> {
  const channel = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    select: { projectId: true },
  });

  const message = await prisma.message.create({
    data: { channelId, content, isSystem: true },
    include: MESSAGE_INCLUDE,
  });

  // Emite para que clientes conectados vejam a mensagem de sistema em tempo real.
  eventBus.publish(
    createEvent("message:sent", channel.projectId, {
      messageId: message.id,
      channelId,
      content,
    }),
  );

  return toMessageDTO(message, "");
}

export async function projectIdOfChannel(channelId: string): Promise<string | null> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { projectId: true },
  });
  return channel?.projectId ?? null;
}

export async function defaultChannelId(projectId: string): Promise<string | null> {
  const channel = await prisma.channel.findFirst({
    where: { projectId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return channel?.id ?? null;
}

// ── Mensagens diretas (DM) ─────────────────────────────────────────────────

/** Chave determinística de um par (independe da ordem dos ids). */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

type ParticipantRow = { user: { id: string; name: string } };

function toConversationDTO(
  conv: { id: string; participants: ParticipantRow[]; messages: { createdAt: Date }[] },
  viewerId: string,
): DirectConversationDTO {
  return {
    id: conv.id,
    participants: conv.participants
      .filter((p) => p.user.id !== viewerId)
      .map((p): MemberDTO => ({ id: p.user.id, name: p.user.name })),
    lastMessageAt: conv.messages[0]?.createdAt.toISOString() ?? null,
  };
}

const CONVERSATION_INCLUDE = {
  participants: { include: { user: { select: { id: true, name: true } } } },
  messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
} as const;

/** Conversas privadas de que o usuário participa dentro do projeto. */
export async function listConversations(
  projectId: string,
  viewerId: string,
): Promise<DirectConversationDTO[]> {
  const convs = await prisma.directConversation.findMany({
    where: { projectId, participants: { some: { userId: viewerId } } },
    include: CONVERSATION_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return convs
    .map((c) => toConversationDTO(c, viewerId))
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
}

/** Abre (ou cria) a conversa 1:1 entre dois membros do projeto. */
export async function openDirect(
  projectId: string,
  viewerId: string,
  otherUserId: string,
): Promise<DirectConversationDTO> {
  const key = pairKey(viewerId, otherUserId);
  const conv = await prisma.directConversation.upsert({
    where: { projectId_pairKey: { projectId, pairKey: key } },
    create: {
      projectId,
      pairKey: key,
      participants: { create: [{ userId: viewerId }, { userId: otherUserId }] },
    },
    update: {},
    include: CONVERSATION_INCLUDE,
  });
  return toConversationDTO(conv, viewerId);
}

export async function getDirectMessages(
  conversationId: string,
  viewerId: string,
  limit = MESSAGE_PAGE_SIZE,
): Promise<MessageDTO[]> {
  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: MESSAGE_INCLUDE,
  });
  return rows.reverse().map((row) => toMessageDTO(row, viewerId));
}

export async function sendDirectMessage(
  conversationId: string,
  content: string,
  actorId: string,
  replyToId?: string | null,
): Promise<MessageDTO> {
  const conv = await prisma.directConversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { projectId: true, participants: { select: { userId: true } } },
  });

  const message = await prisma.message.create({
    data: {
      conversationId,
      content,
      userId: actorId,
      replyToId: await replyIdIfInConversation(replyToId, conversationId),
    },
    include: MESSAGE_INCLUDE,
  });

  eventBus.publish(
    createEvent(
      "dm:sent",
      conv.projectId,
      {
        messageId: message.id,
        conversationId,
        participantIds: conv.participants.map((p) => p.userId),
      },
      actorId,
    ),
  );

  return toMessageDTO(message, actorId);
}

/** Para os guards da API: projeto + participantes de uma conversa. */
export async function conversationAccess(
  conversationId: string,
): Promise<{ projectId: string; participantIds: string[] } | null> {
  const conv = await prisma.directConversation.findUnique({
    where: { id: conversationId },
    select: { projectId: true, participants: { select: { userId: true } } },
  });
  if (!conv) return null;
  return { projectId: conv.projectId, participantIds: conv.participants.map((p) => p.userId) };
}

// ── Reações ────────────────────────────────────────────────────────────────

/** Contexto de uma mensagem (canal/conversa/projeto) — para guards e roteamento. */
export async function messageContext(messageId: string): Promise<{
  projectId: string;
  channelId: string | null;
  conversationId: string | null;
  participantIds: string[];
} | null> {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      channelId: true,
      conversationId: true,
      channel: { select: { projectId: true } },
      conversation: {
        select: { projectId: true, participants: { select: { userId: true } } },
      },
    },
  });
  if (!msg) return null;
  const projectId = msg.channel?.projectId ?? msg.conversation?.projectId;
  if (!projectId) return null;
  return {
    projectId,
    channelId: msg.channelId,
    conversationId: msg.conversationId,
    participantIds: msg.conversation?.participants.map((p) => p.userId) ?? [],
  };
}

/** Adiciona/remove a reação (toggle) e publica `reaction:changed`. */
export async function toggleReaction(
  messageId: string,
  emoji: string,
  userId: string,
): Promise<void> {
  const ctx = await messageContext(messageId);
  if (!ctx) return;

  const existing = await prisma.reaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { messageId, userId, emoji } });
  }

  eventBus.publish(
    createEvent(
      "reaction:changed",
      ctx.projectId,
      {
        messageId,
        channelId: ctx.channelId,
        conversationId: ctx.conversationId,
        // só preenche participantes em DM (roteamento por room pessoal)
        participantIds: ctx.conversationId ? ctx.participantIds : [],
      },
      userId,
    ),
  );
}
