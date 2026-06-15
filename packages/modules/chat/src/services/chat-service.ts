import { prisma } from "@kerno/db";
import { createEvent, eventBus } from "@kerno/events";
import type { ChannelDTO, MessageDTO } from "../types";

const MESSAGE_PAGE_SIZE = 50;

type MessageRow = {
  id: string;
  content: string;
  createdAt: Date;
  isSystem: boolean;
  user: { id: string; name: string } | null;
};

function toMessageDTO(row: MessageRow): MessageDTO {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    isSystem: row.isSystem,
    author: row.user ? { id: row.user.id, name: row.user.name } : null,
  };
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
  limit = MESSAGE_PAGE_SIZE,
): Promise<MessageDTO[]> {
  const rows = await prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { id: true, name: true } } },
  });
  return rows.reverse().map(toMessageDTO);
}

export async function createChannel(projectId: string, name: string): Promise<ChannelDTO> {
  const channel = await prisma.channel.create({ data: { projectId, name } });
  return { id: channel.id, name: channel.name, isDefault: channel.isDefault };
}

export async function sendMessage(
  channelId: string,
  content: string,
  actorId: string,
): Promise<MessageDTO> {
  const channel = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    select: { projectId: true },
  });

  const message = await prisma.message.create({
    data: { channelId, content, userId: actorId },
    include: { user: { select: { id: true, name: true } } },
  });

  eventBus.publish(
    createEvent(
      "message:sent",
      channel.projectId,
      { messageId: message.id, channelId, content },
      actorId,
    ),
  );

  return toMessageDTO(message);
}

/** Mensagem de sistema (sem autor) — usada na integração entre hubs. */
export async function postSystemMessage(channelId: string, content: string): Promise<MessageDTO> {
  const channel = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    select: { projectId: true },
  });

  const message = await prisma.message.create({
    data: { channelId, content, isSystem: true },
    include: { user: { select: { id: true, name: true } } },
  });

  // Emite para que clientes conectados vejam a mensagem de sistema em tempo real.
  eventBus.publish(
    createEvent("message:sent", channel.projectId, {
      messageId: message.id,
      channelId,
      content,
    }),
  );

  return toMessageDTO(message);
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
