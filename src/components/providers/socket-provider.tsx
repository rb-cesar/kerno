"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Conexão única pro processo inteiro do usuário logado — monta na raiz
 * (app)/layout.tsx, não por workspace: a room pessoal (`user:<id>`) é
 * necessária em qualquer tela (ex.: notificações na lista de workspaces),
 * não só dentro de um workspace aberto. Presença/rooms por workspace são
 * responsabilidade de quem usa este socket (ver workspace-presence-provider).
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Mesma origem do web: o cookie de sessão vai junto sozinho, sem token
    // explícito no handshake.
    const s = io();
    setSocket(s);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, []);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}
