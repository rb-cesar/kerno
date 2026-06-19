import type { Server as IOServer } from "socket.io";
import type { AnyKernoEvent } from "@kerno/core/types";
import { eventBus } from "@kerno/core/events";
import { prisma, Prisma } from "@kerno/db";

let initialized = false;

/**
 * Liga o event bus in-process ao mundo externo:
 *  1) persiste cada evento na tabela `Event` (auditoria);
 *  2) repassa o evento via Socket.io — para a room do projeto, ou, no caso de
 *     mensagens diretas (`dm:sent`), só para as rooms pessoais dos participantes.
 *
 * Roda no processo da API (onde os services publicam os eventos).
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

    // DM é privada: entrega só aos participantes, não à room do projeto inteiro.
    if (event.type === "dm:sent") {
      for (const participantId of event.payload.participantIds) {
        io.to(`user:${participantId}`).emit("kerno:event", event);
      }
      return;
    }

    // Edição/reação numa DM: também é privada (participantIds preenchido só nesse caso).
    if (
      (event.type === "reaction:changed" || event.type === "message:edited") &&
      event.payload.participantIds.length > 0
    ) {
      for (const participantId of event.payload.participantIds) {
        io.to(`user:${participantId}`).emit("kerno:event", event);
      }
      return;
    }

    io.to(`project:${event.projectId}`).emit("kerno:event", event);
  });

  console.log("▸ Event dispatcher inicializado");
}
