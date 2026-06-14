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
  userId,
  children,
}: {
  projectId: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    const s = io({ path: "/socket.io" });
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      s.emit("project:join", { projectId, userId });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("presence:update", (ids: string[]) => setOnlineUserIds(ids));

    return () => {
      s.emit("project:leave", { projectId });
      s.disconnect();
      setSocket(null);
    };
  }, [projectId, userId]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
}
