import type { Server as IOServer } from "socket.io";
import type { AnyKernoEvent } from "@kerno/core/types";
import { eventBus } from "@kerno/core/events";
import { prisma, Prisma } from "@kerno/db";

let initialized = false;

/**
 * Liga o event bus in-process ao mundo externo:
 *  1) persiste cada evento na tabela `Event` (auditoria);
 *  2) repassa o evento para a room do projeto via Socket.io.
 *
 * Chamado uma única vez no boot do servidor (server.ts).
 */
export function initEventDispatcher(io: IOServer): void {
  if (initialized) return;
  initialized = true;

  eventBus.onAny(async (event: AnyKernoEvent) => {
    try {
      await prisma.event.create({
        data: {
          type: event.type,
          payload: event.payload as unknown as Prisma.InputJsonValue,
          projectId: event.projectId,
          userId: event.userId ?? null,
        },
      });
    } catch (err) {
      console.error("[events] falha ao persistir evento", event.type, err);
    }

    io.to(`project:${event.projectId}`).emit("kerno:event", event);
  });

  console.log("▸ Event dispatcher inicializado");
}
