"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  onlineUserIds: string[];
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  onlineUserIds: [],
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ workspaceId, children }: { workspaceId: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    // Mesma origem do web: o cookie de sessão vai junto sozinho, sem token
    // explícito no handshake.
    const s = io();
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      // userId vem da sessão (cookie), validado no servidor no handshake.
      s.emit("workspace:join", { workspaceId });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("presence:update", (ids: string[]) => setOnlineUserIds(ids));

    return () => {
      s.emit("workspace:leave", { workspaceId });
      s.disconnect();
      setSocket(null);
    };
  }, [workspaceId]);

  return <SocketContext.Provider value={{ socket, connected, onlineUserIds }}>{children}</SocketContext.Provider>;
}
