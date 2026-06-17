import { eventBus } from "@kerno/core/events";
import { prisma } from "@kerno/db";
import { defaultChannelId, postSystemMessage } from "@kerno/chat/services";
import type { AnyKernoEvent } from "@kerno/core/types";

let registered = false;

async function userName(userId?: string): Promise<string> {
  if (!userId) return "Alguém";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? "Alguém";
}

/** Traduz um evento do Kanban em uma frase para o Chat. `null` = não anunciar. */
async function describe(event: AnyKernoEvent): Promise<string | null> {
  const who = await userName(event.userId);

  switch (event.type) {
    case "card:created":
      return `${who} criou o card "${event.payload.title}"`;
    case "card:moved": {
      const column = await prisma.column.findUnique({
        where: { id: event.payload.toColumnId },
        select: { name: true },
      });
      return `${who} moveu "${event.payload.title}" para ${column?.name ?? "outra coluna"} ✓`;
    }
    case "card:assigned": {
      if (!event.payload.assignedTo) {
        return `${who} removeu o responsável de "${event.payload.title}"`;
      }
      const assignee = await userName(event.payload.assignedTo);
      return `${who} atribuiu "${event.payload.title}" a ${assignee}`;
    }
    default:
      return null;
  }
}

/**
 * Integração entre hubs: ao receber eventos do Kanban, posta uma mensagem de
 * sistema no canal padrão do projeto. Vive na camada de composição da API —
 * nenhum hub conhece o outro. Registrada uma vez no boot.
 */
export function initKanbanChatIntegration(): void {
  if (registered) return;
  registered = true;

  const handle = async (event: AnyKernoEvent) => {
    try {
      const text = await describe(event);
      if (!text) return;
      const channelId = await defaultChannelId(event.projectId);
      if (!channelId) return;
      await postSystemMessage(channelId, text);
    } catch (err) {
      console.error("[integration:kanban-chat] falha ao anunciar evento", event.type, err);
    }
  };

  eventBus.on("card:created", handle);
  eventBus.on("card:moved", handle);
  eventBus.on("card:assigned", handle);

  console.log("▸ Integração Kanban→Chat ativa");
}
