"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import type { AnyKernoEvent } from "@/core/events";

/**
 * Avisa sobre mudança remota em chamadas (iniciada/encerrada) — quem escuta
 * resincroniza a lista de chamadas ativas. Eventos do próprio usuário são
 * ignorados (já aplicados de forma otimista localmente).
 */
export function useCallsRealtime(socket: Socket | null, currentUserId: string, onRemoteChange: () => void) {
  useEffect(() => {
    if (!socket) return;

    const handler = (event: AnyKernoEvent) => {
      if (event.userId === currentUserId) return;
      if (event.type === "call:started" || event.type === "call:ended") onRemoteChange();
    };

    socket.on("kerno:event", handler);
    return () => {
      socket.off("kerno:event", handler);
    };
  }, [socket, currentUserId, onRemoteChange]);
}
