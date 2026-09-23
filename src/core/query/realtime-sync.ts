"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import type { AnyKernoEvent, KernoEvent, KernoEventType } from "@/core/events";

/**
 * Ponte genérica `kerno:event` → cache do React Query — substitui os hooks de
 * realtime que cada módulo hoje hand-rola (`use-kanban-realtime.ts`,
 * `use-chat-realtime.ts`) por uma lista declarativa de mappings.
 *
 * `skipOwnEvents` é por entrada, não uma flag global: a maioria dos mappings
 * quer ignorar o eco do próprio evento (já refletido via escrita otimista no
 * cache — re-invalidar nesse caso é redundante e pode piscar), mas nem todo
 * mapping futuro necessariamente quer isso (ex.: um broadcast que afeta
 * vários componentes, só um dos quais aplicou algo otimista).
 *
 * Limite conhecido: notificações não passam pelo catálogo `kerno:event` — o
 * servidor emite `"notification:new"` à parte, com DTO pronto. Essa ponte não
 * cobre esse caso; o módulo de notificações precisa do próprio listener.
 */
export interface RealtimeMapping<T extends KernoEventType = KernoEventType> {
  type: T;
  /** @default true */
  skipOwnEvents?: boolean;
  invalidate: (event: KernoEvent<T>, queryClient: QueryClient) => void;
}

export function mapEvent<T extends KernoEventType>(
  type: T,
  invalidate: (event: KernoEvent<T>, queryClient: QueryClient) => void,
  opts?: { skipOwnEvents?: boolean },
): RealtimeMapping<T> {
  return { type, invalidate, skipOwnEvents: opts?.skipOwnEvents };
}

export function useRealtimeQuerySync(
  socket: Socket | null,
  queryClient: QueryClient,
  currentUserId: string,
  mappings: RealtimeMapping[],
): void {
  useEffect(() => {
    if (!socket) return;

    const handler = (event: AnyKernoEvent) => {
      for (const mapping of mappings) {
        if (mapping.type !== event.type) continue;
        if ((mapping.skipOwnEvents ?? true) && event.userId === currentUserId) continue;
        mapping.invalidate(event as KernoEvent<typeof mapping.type>, queryClient);
      }
    };

    socket.on("kerno:event", handler);
    return () => {
      socket.off("kerno:event", handler);
    };
  }, [socket, queryClient, currentUserId, mappings]);
}
