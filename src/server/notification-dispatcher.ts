import { prisma } from "@/core/db";
import type { AnyKernoEvent } from "@/core/events";
import { notificationDomain } from "@/modules/notifications/server";
import type { NotificationDTO } from "@/modules/notifications/types";

// Tipos de evento que podem virar notificação — filtra antes de gastar
// consulta em eventos irrelevantes (card:moved, reaction:changed, ...). O type
// guard (em vez de um Set.has) é o que deixa o TS estreitar o payload abaixo.
type RelevantEvent = Extract<
  AnyKernoEvent,
  { type: "card:assigned" | "card:commented" | "message:sent" | "dm:sent" | "call:started" }
>;

function isRelevant(event: AnyKernoEvent): event is RelevantEvent {
  return (
    event.type === "card:assigned" ||
    event.type === "card:commented" ||
    event.type === "message:sent" ||
    event.type === "dm:sent" ||
    event.type === "call:started"
  );
}

async function actorName(userId?: string): Promise<string> {
  if (!userId) return "Alguém";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? "Alguém";
}

function mentionedUserIds(content: string): string[] {
  const ids = new Set<string>();
  for (const m of content.matchAll(/@\[[^\]]+\]\(user:([^)]+)\)/g)) {
    if (m[1]) ids.add(m[1]);
  }
  return [...ids];
}

/** Remove a sintaxe de menção do markdown e corta pra um preview curto. */
function excerptOf(content: string): string {
  const plain = content.replace(/@\[([^\]]+)\]\(user:[^)]+\)/g, "@$1");
  return plain.length > 120 ? `${plain.slice(0, 120)}…` : plain;
}

type Recipient = { userId: string; title: string; body?: string | null; link?: string | null };

/**
 * Traduz um evento do bus em notificações por destinatário. Único lugar que
 * entende o formato de payload do Kanban e do Chat ao mesmo tempo — nem o
 * módulo notifications, nem os outros, têm essa visão cruzada (mesmo
 * princípio de server/kanban-chat.ts).
 */
async function recipientsFor(event: RelevantEvent, workspaceSlug: string): Promise<Recipient[]> {
  const out = new Map<string, Recipient>();
  const who = await actorName(event.userId);

  if (event.type === "card:assigned") {
    const { assignedTo, title, cardId } = event.payload;
    if (assignedTo && assignedTo !== event.userId) {
      out.set(assignedTo, {
        userId: assignedTo,
        title: `${who} atribuiu "${title}" a você`,
        link: `/w/${workspaceSlug}/boards?card=${cardId}`,
      });
    }
    return [...out.values()];
  }

  if (event.type === "card:commented") {
    const { assignedTo, title, cardId, excerpt } = event.payload;
    if (assignedTo && assignedTo !== event.userId) {
      out.set(assignedTo, {
        userId: assignedTo,
        title: `${who} comentou em "${title}"`,
        body: excerpt,
        link: `/w/${workspaceSlug}/boards?card=${cardId}`,
      });
    }
    return [...out.values()];
  }

  if (event.type === "call:started") {
    // Só chamada de DM vira notificação — chamada de canal já tem o banner
    // visível a todo mundo no workspace, notificar seria ruído.
    if (!event.payload.conversationId) return [];
    const link = `/w/${workspaceSlug}/chat?dm=${event.payload.conversationId}`;
    for (const participantId of event.payload.participantIds) {
      if (participantId === event.userId) continue;
      out.set(participantId, { userId: participantId, title: `${who} está te ligando`, link });
    }
    return [...out.values()];
  }

  // Deep-link pro canal ou pra DM específica — não pra mensagem em si (não há
  // scroll-to-message hoje, só troca o canal/DM ativo).
  const link =
    event.type === "dm:sent"
      ? `/w/${workspaceSlug}/chat?dm=${event.payload.conversationId}`
      : `/w/${workspaceSlug}/chat?channel=${event.payload.channelId}`;

  // message:sent (canal) e dm:sent compartilham a mesma origem: a mensagem em
  // si não carrega replyToId/conteúdo completo no payload do evento, então
  // buscamos direto — mesma consulta serve pra reply e pra menção.
  const message = await prisma.message.findUnique({
    where: { id: event.payload.messageId },
    select: { content: true, replyTo: { select: { userId: true } } },
  });
  if (!message) return [];

  const excerpt = excerptOf(message.content);

  const replyToUserId = message.replyTo?.userId;
  if (replyToUserId && replyToUserId !== event.userId) {
    out.set(replyToUserId, { userId: replyToUserId, title: `${who} respondeu sua mensagem`, body: excerpt, link });
  }

  if (event.type === "dm:sent") {
    for (const participantId of event.payload.participantIds) {
      if (participantId === event.userId) continue;
      out.set(participantId, {
        userId: participantId,
        title: `${who} enviou uma mensagem direta`,
        body: excerpt,
        link,
      });
    }
  } else {
    for (const userId of mentionedUserIds(message.content)) {
      if (userId === event.userId) continue;
      out.set(userId, { userId, title: `${who} mencionou você no chat`, body: excerpt, link });
    }
  }

  return [...out.values()];
}

/**
 * Ponto de entrada chamado pelo event-dispatcher logo após persistir o
 * Event (precisa do `id` gerado). Retorna as notificações criadas já com o
 * destinatário, pra quem chamou empurrar via socket pra `user:<id>`.
 */
export async function notifyRecipients(
  event: AnyKernoEvent & { id: string },
): Promise<{ userId: string; dto: NotificationDTO }[]> {
  if (!isRelevant(event)) return [];

  const workspace = await prisma.workspace.findUnique({
    where: { id: event.workspaceId },
    select: { slug: true },
  });
  if (!workspace) return [];

  const recipients = await recipientsFor(event, workspace.slug);
  return notificationDomain.notify(event.id, recipients);
}
