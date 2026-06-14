"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import type { AnyKernoEvent } from "@kerno/types";

/**
 * Reage a eventos `card:*` de OUTROS usuários no mesmo projeto e dispara um
 * resync. Eventos do próprio usuário são ignorados (já aplicados de forma
 * otimista localmente).
 */
export function useKanbanRealtime(
  socket: Socket | null,
  currentUserId: string,
  onRemoteChange: () => void,
) {
  useEffect(() => {
    if (!socket) return;

    const handler = (event: AnyKernoEvent) => {
      if (event.userId === currentUserId) return;
      if (event.type.startsWith("card:")) onRemoteChange();
    };

    socket.on("kerno:event", handler);
    return () => {
      socket.off("kerno:event", handler);
    };
  }, [socket, currentUserId, onRemoteChange]);
}
