"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import type { AnyKernoEvent } from "@kerno/core/types";

/** Alvo de uma mensagem recebida em tempo real. */
export type ChatTarget =
  | { kind: "channel"; id: string }
  | { kind: "dm"; id: string; participantIds: string[] };

/**
 * Escuta mensagens novas (de canal e diretas) e notifica o componente,
 * indicando se o evento veio do próprio usuário (já tratado de forma otimista)
 * ou de outro. DMs chegam só pela room pessoal — ver event-dispatcher na API.
 */
export function useChatRealtime(
  socket: Socket | null,
  currentUserId: string,
  onMessage: (target: ChatTarget, fromSelf: boolean) => void,
) {
  useEffect(() => {
    if (!socket) return;

    const handler = (event: AnyKernoEvent) => {
      const fromSelf = event.userId === currentUserId;
      if (event.type === "message:sent") {
        onMessage({ kind: "channel", id: event.payload.channelId }, fromSelf);
      } else if (event.type === "dm:sent") {
        onMessage(
          {
            kind: "dm",
            id: event.payload.conversationId,
            participantIds: event.payload.participantIds,
          },
          fromSelf,
        );
      }
    };

    socket.on("kerno:event", handler);
    return () => {
      socket.off("kerno:event", handler);
    };
  }, [socket, currentUserId, onMessage]);
}
