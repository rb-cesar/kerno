"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import type { AnyKernoEvent, MessageSentPayload } from "@kerno/core/types";

/**
 * Escuta `message:sent` no projeto e notifica o componente, indicando se o
 * evento veio do próprio usuário (já tratado de forma otimista) ou de outro.
 */
export function useChatRealtime(
  socket: Socket | null,
  currentUserId: string,
  onMessage: (channelId: string, fromSelf: boolean) => void,
) {
  useEffect(() => {
    if (!socket) return;

    const handler = (event: AnyKernoEvent) => {
      if (event.type !== "message:sent") return;
      const payload = event.payload as MessageSentPayload;
      onMessage(payload.channelId, event.userId === currentUserId);
    };

    socket.on("kerno:event", handler);
    return () => {
      socket.off("kerno:event", handler);
    };
  }, [socket, currentUserId, onMessage]);
}
