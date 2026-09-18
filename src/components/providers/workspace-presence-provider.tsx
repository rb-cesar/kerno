"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./socket-provider";

const PresenceContext = createContext<string[]>([]);

export function useWorkspacePresence(): string[] {
  return useContext(PresenceContext);
}

/**
 * Entra/sai da room do workspace (`workspace:<id>`) no socket compartilhado —
 * separado da conexão em si (ver socket-provider) porque o workspace ativo
 * muda durante a sessão, a conexão não. Monta no layout de /w/[slug].
 */
export function WorkspacePresenceProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const { socket, connected } = useSocket();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit("workspace:join", { workspaceId });
    const onUpdate = (ids: string[]) => setOnlineUserIds(ids);
    socket.on("presence:update", onUpdate);

    return () => {
      socket.emit("workspace:leave", { workspaceId });
      socket.off("presence:update", onUpdate);
      setOnlineUserIds([]);
    };
  }, [socket, connected, workspaceId]);

  return <PresenceContext.Provider value={onlineUserIds}>{children}</PresenceContext.Provider>;
}
