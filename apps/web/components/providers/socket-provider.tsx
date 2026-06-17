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

export function SocketProvider({
  projectId,
  url,
  token,
  children,
}: {
  projectId: string;
  /** Origem da API (sem o /api), onde o Socket.io vive. */
  url: string;
  /** JWT da sessão (BFF) — usado no handshake. */
  token: string | null;
  children: React.ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;

    const s = io(url, { auth: { token } });
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      // userId agora vem do token, validado no servidor.
      s.emit("project:join", { projectId });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("presence:update", (ids: string[]) => setOnlineUserIds(ids));

    return () => {
      s.emit("project:leave", { projectId });
      s.disconnect();
      setSocket(null);
    };
  }, [projectId, url, token]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
}
