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
export type ChatEventKind = "message" | "reaction";

export function useChatRealtime(
  socket: Socket | null,
  currentUserId: string,
  onEvent: (target: ChatTarget, fromSelf: boolean, kind: ChatEventKind) => void,
) {
  useEffect(() => {
    if (!socket) return;

    const handler = (event: AnyKernoEvent) => {
      const fromSelf = event.userId === currentUserId;
      if (event.type === "message:sent") {
        onEvent({ kind: "channel", id: event.payload.channelId }, fromSelf, "message");
      } else if (event.type === "dm:sent") {
        onEvent(
          {
            kind: "dm",
            id: event.payload.conversationId,
            participantIds: event.payload.participantIds,
          },
          fromSelf,
          "message",
        );
      } else if (event.type === "reaction:changed") {
        const p = event.payload;
        if (p.channelId) {
          onEvent({ kind: "channel", id: p.channelId }, fromSelf, "reaction");
        } else if (p.conversationId) {
          onEvent(
            { kind: "dm", id: p.conversationId, participantIds: p.participantIds },
            fromSelf,
            "reaction",
          );
        }
      }
    };

    socket.on("kerno:event", handler);
    return () => {
      socket.off("kerno:event", handler);
    };
  }, [socket, currentUserId, onEvent]);
}
