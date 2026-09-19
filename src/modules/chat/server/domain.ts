import { prisma } from "@/core/db";
import { createEvent, eventBus } from "@/core/events";
import { fetchCursorPage } from "@/core/pagination";
import type { ChannelDTO, DirectConversationDTO, MemberDTO, MessageDTO, MessagesPage, ReactionDTO } from "../types";

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
  updatedAt: Date;
  isSystem: boolean;
  user: { id: string; name: string } | null;
  replyTo?: ReplyRow;
  reactions?: ReactionRow[];
};

/** Chave determinística de um par (independe da ordem dos ids). */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

type ParticipantRow = { user: { id: string; name: string } };

const CONVERSATION_INCLUDE = {
  participants: { include: { user: { select: { id: true, name: true } } } },
  messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
} as const;

export class ChatDomain {
  private makeExcerpt(content: string): string {
    return content.replace(/\s+/g, " ").trim().slice(0, 120);
  }

  /** Agrupa reações por emoji, preservando a ordem de 1ª aparição. */
  private aggregateReactions(rows: ReactionRow[], viewerId: string): ReactionDTO[] {
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    for (const r of rows) {
      const entry = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (r.userId === viewerId) entry.mine = true;
      byEmoji.set(r.emoji, entry);
    }
    return [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
  }

  private toMessageDTO(row: MessageRow, viewerId: string): MessageDTO {
    return {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      // updatedAt só difere de createdAt quando o conteúdo foi editado (reações e
      // respostas vivem em tabelas próprias e não tocam a mensagem).
      editedAt: row.updatedAt.getTime() !== row.createdAt.getTime() ? row.updatedAt.toISOString() : null,
      isSystem: row.isSystem,
      author: row.user ? { id: row.user.id, name: row.user.name } : null,
      replyTo: row.replyTo
        ? {
            id: row.replyTo.id,
            authorName: row.replyTo.isSystem ? "Sistema" : (row.replyTo.user?.name ?? "Desconhecido"),
            excerpt: this.makeExcerpt(row.replyTo.content),
          }
        : null,
      reactions: this.aggregateReactions(row.reactions ?? [], viewerId),
    };
  }

  /** Garante que a mensagem citada pertence ao mesmo canal (senão ignora). */
  private async replyIdIfInChannel(replyToId: string | null | undefined, channelId: string): Promise<string | null> {
    if (!replyToId) return null;
    const target = await prisma.message.findUnique({
      where: { id: replyToId },
      select: { channelId: true },
    });
    return target?.channelId === channelId ? replyToId : null;
  }

  /** Garante que a mensagem citada pertence à mesma conversa (senão ignora). */
  private async replyIdIfInConversation(
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

  private toConversationDTO(
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

  async listChannels(workspaceId: string): Promise<ChannelDTO[]> {
    const channels = await prisma.channel.findMany({
      where: { workspaceId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return channels.map((c) => ({ id: c.id, name: c.name, isDefault: c.isDefault }));
  }

  /** `beforeId`: id da mensagem mais antiga já carregada — paginação por cursor (ver `fetchCursorPage`). */
  async getMessages(
    channelId: string,
    viewerId: string,
    beforeId?: string,
    limit = MESSAGE_PAGE_SIZE,
  ): Promise<MessagesPage> {
    const page = await fetchCursorPage(
      (args) =>
        prisma.message.findMany({
          where: { channelId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: MESSAGE_INCLUDE,
          ...args,
        }),
      beforeId,
      limit,
    );
    return { items: page.items.reverse().map((row) => this.toMessageDTO(row, viewerId)), hasMore: page.hasMore };
  }

  async createChannel(workspaceId: string, name: string): Promise<ChannelDTO> {
    const channel = await prisma.channel.create({ data: { workspaceId, name } });
    return { id: channel.id, name: channel.name, isDefault: channel.isDefault };
  }

  async sendMessage(
    channelId: string,
    content: string,
    actorId: string,
    replyToId?: string | null,
  ): Promise<MessageDTO> {
    const channel = await prisma.channel.findUniqueOrThrow({
      where: { id: channelId },
      select: { workspaceId: true },
    });

    const message = await prisma.message.create({
      data: {
        channelId,
        content,
        userId: actorId,
        replyToId: await this.replyIdIfInChannel(replyToId, channelId),
      },
      include: MESSAGE_INCLUDE,
    });

    eventBus.publish(
      createEvent("message:sent", channel.workspaceId, { messageId: message.id, channelId, content }, actorId),
    );

    return this.toMessageDTO(message, actorId);
  }

  /**
   * Edita o conteúdo de uma mensagem. Só o autor pode editar, e mensagens de
   * sistema não são editáveis. Publica `message:edited` para atualizar os clientes
   * em tempo real (canal → room do projeto; DM → rooms pessoais dos participantes).
   */
  async editMessage(messageId: string, content: string, actorId: string): Promise<MessageDTO> {
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true, isSystem: true },
    });
    if (!existing) throw new Error("Mensagem não encontrada");
    if (existing.isSystem || existing.userId !== actorId) {
      throw new Error("Você só pode editar suas próprias mensagens");
    }

    const ctx = await this.messageContext(messageId);
    if (!ctx) throw new Error("Mensagem não encontrada");

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { content },
      include: MESSAGE_INCLUDE,
    });

    eventBus.publish(
      createEvent(
        "message:edited",
        ctx.workspaceId,
        {
          messageId,
          channelId: ctx.channelId,
          conversationId: ctx.conversationId,
          // só preenche participantes em DM (roteamento por room pessoal)
          participantIds: ctx.conversationId ? ctx.participantIds : [],
          content,
        },
        actorId,
      ),
    );

    return this.toMessageDTO(message, actorId);
  }

  /** Mensagem de sistema (sem autor) — usada na integração entre hubs. */
  async postSystemMessage(channelId: string, content: string): Promise<MessageDTO> {
    const channel = await prisma.channel.findUniqueOrThrow({
      where: { id: channelId },
      select: { workspaceId: true },
    });

    const message = await prisma.message.create({
      data: { channelId, content, isSystem: true },
      include: MESSAGE_INCLUDE,
    });

    // Emite para que clientes conectados vejam a mensagem de sistema em tempo real.
    eventBus.publish(
      createEvent("message:sent", channel.workspaceId, {
        messageId: message.id,
        channelId,
        content,
      }),
    );

    return this.toMessageDTO(message, "");
  }

  async workspaceIdOfChannel(channelId: string): Promise<string | null> {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { workspaceId: true },
    });
    return channel?.workspaceId ?? null;
  }

  async defaultChannelId(workspaceId: string): Promise<string | null> {
    const channel = await prisma.channel.findFirst({
      where: { workspaceId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    return channel?.id ?? null;
  }

  // ── Mensagens diretas (DM) ─────────────────────────────────────────────

  /** Conversas privadas de que o usuário participa dentro do projeto. */
  async listConversations(workspaceId: string, viewerId: string): Promise<DirectConversationDTO[]> {
    const convs = await prisma.directConversation.findMany({
      where: { workspaceId, participants: { some: { userId: viewerId } } },
      include: CONVERSATION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return convs
      .map((c) => this.toConversationDTO(c, viewerId))
      .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  }

  /** Abre (ou cria) a conversa 1:1 entre dois membros do projeto. */
  async openDirect(workspaceId: string, viewerId: string, otherUserId: string): Promise<DirectConversationDTO> {
    const key = pairKey(viewerId, otherUserId);
    const conv = await prisma.directConversation.upsert({
      where: { workspaceId_pairKey: { workspaceId, pairKey: key } },
      create: {
        workspaceId,
        pairKey: key,
        participants: { create: [{ userId: viewerId }, { userId: otherUserId }] },
      },
      update: {},
      include: CONVERSATION_INCLUDE,
    });
    return this.toConversationDTO(conv, viewerId);
  }

  async getDirectMessages(
    conversationId: string,
    viewerId: string,
    beforeId?: string,
    limit = MESSAGE_PAGE_SIZE,
  ): Promise<MessagesPage> {
    const page = await fetchCursorPage(
      (args) =>
        prisma.message.findMany({
          where: { conversationId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: MESSAGE_INCLUDE,
          ...args,
        }),
      beforeId,
      limit,
    );
    return { items: page.items.reverse().map((row) => this.toMessageDTO(row, viewerId)), hasMore: page.hasMore };
  }

  async sendDirectMessage(
    conversationId: string,
    content: string,
    actorId: string,
    replyToId?: string | null,
  ): Promise<MessageDTO> {
    const conv = await prisma.directConversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { workspaceId: true, participants: { select: { userId: true } } },
    });

    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        userId: actorId,
        replyToId: await this.replyIdIfInConversation(replyToId, conversationId),
      },
      include: MESSAGE_INCLUDE,
    });

    eventBus.publish(
      createEvent(
        "dm:sent",
        conv.workspaceId,
        {
          messageId: message.id,
          conversationId,
          participantIds: conv.participants.map((p) => p.userId),
        },
        actorId,
      ),
    );

    return this.toMessageDTO(message, actorId);
  }

  /** Para os guards da API: projeto + participantes de uma conversa. */
  async conversationAccess(conversationId: string): Promise<{ workspaceId: string; participantIds: string[] } | null> {
    const conv = await prisma.directConversation.findUnique({
      where: { id: conversationId },
      select: { workspaceId: true, participants: { select: { userId: true } } },
    });
    if (!conv) return null;
    return {
      workspaceId: conv.workspaceId,
      participantIds: conv.participants.map((p) => p.userId),
    };
  }

  // ── Reações ──────────────────────────────────────────────────────────────

  /** Contexto de uma mensagem (canal/conversa/projeto) — para guards e roteamento. */
  async messageContext(messageId: string): Promise<{
    workspaceId: string;
    channelId: string | null;
    conversationId: string | null;
    participantIds: string[];
  } | null> {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        channelId: true,
        conversationId: true,
        channel: { select: { workspaceId: true } },
        conversation: {
          select: { workspaceId: true, participants: { select: { userId: true } } },
        },
      },
    });
    if (!msg) return null;
    const workspaceId = msg.channel?.workspaceId ?? msg.conversation?.workspaceId;
    if (!workspaceId) return null;
    return {
      workspaceId,
      channelId: msg.channelId,
      conversationId: msg.conversationId,
      participantIds: msg.conversation?.participants.map((p) => p.userId) ?? [],
    };
  }

  /** Adiciona/remove a reação (toggle) e publica `reaction:changed`. */
  async toggleReaction(messageId: string, emoji: string, userId: string): Promise<void> {
    const ctx = await this.messageContext(messageId);
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
        ctx.workspaceId,
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
}

export function createChatDomain(): ChatDomain {
  return new ChatDomain();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const chatDomain = createChatDomain();
