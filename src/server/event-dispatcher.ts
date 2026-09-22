import type { Server as IOServer } from "socket.io";
import { type Prisma, prisma } from "@/core/db";
import type { AnyKernoEvent } from "@/core/events";
import { eventBus } from "@/core/events";
import { notifyRecipients } from "./notification-dispatcher";

let initialized = false;

/**
 * Liga o event bus in-process ao mundo externo:
 *  1) persiste cada evento na tabela `Event` (auditoria);
 *  2) repassa o evento via Socket.io — para a room do workspace, ou, no caso de
 *     mensagens diretas (`dm:sent`), só para as rooms pessoais dos participantes;
 *  3) decide se o evento gera notificação pra alguém (notification-dispatcher)
 *     e empurra pra room pessoal de cada destinatário — precisa do `id`
 *     persistido no passo 1, por isso roda depois.
 */
export function initEventDispatcher(io: IOServer): void {
  if (initialized) return;
  initialized = true;

  eventBus.onAny(async (event: AnyKernoEvent) => {
    let persistedId: string | null = null;
    try {
      const persisted = await prisma.event.create({
        data: {
          type: event.type,
          payload: event.payload as unknown as Prisma.InputJsonValue,
          workspaceId: event.workspaceId,
          userId: event.userId ?? null,
        },
        select: { id: true },
      });
      persistedId = persisted.id;
    } catch (err) {
      console.error("[events] falha ao persistir evento", event.type, err);
    }

    if (persistedId) {
      try {
        const notifications = await notifyRecipients({ ...event, id: persistedId });
        for (const { userId, dto } of notifications) {
          io.to(`user:${userId}`).emit("notification:new", dto);
        }
      } catch (err) {
        console.error("[events] falha ao gerar notificações", event.type, err);
      }
    }

    // DM é privada: entrega só aos participantes, não à room do workspace inteiro.
    if (event.type === "dm:sent") {
      for (const participantId of event.payload.participantIds) {
        io.to(`user:${participantId}`).emit("kerno:event", event);
      }
      return;
    }

    // Edição/reação numa DM (ou chamada numa DM): também é privada
    // (participantIds preenchido só nesse caso; chamada de canal fica vazio e
    // cai no broadcast pro workspace, no fim da função).
    if (
      (event.type === "reaction:changed" ||
        event.type === "message:edited" ||
        event.type === "call:started" ||
        event.type === "call:ended") &&
      event.payload.participantIds.length > 0
    ) {
      for (const participantId of event.payload.participantIds) {
        io.to(`user:${participantId}`).emit("kerno:event", event);
      }
      return;
    }

    io.to(`workspace:${event.workspaceId}`).emit("kerno:event", event);
  });

  console.log("▸ Event dispatcher inicializado");
}
