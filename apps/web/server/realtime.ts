import type { Server as HttpServer } from "node:http";
import { Server as IOServer } from "socket.io";
import { userIdFromCookieHeader } from "@kerno/core/http";
import { initEventDispatcher } from "./event-dispatcher";
import { initKanbanChatIntegration } from "./kanban-chat";

interface SocketData {
  userId: string;
}

/**
 * Sobe o Socket.io anexado ao HTTP server do web e liga o event bus ao
 * realtime. Handshake autenticado pela sessão NextAuth (mesmo cookie do app,
 * lido do handshake) — nada de JWT próprio: web e socket são o mesmo processo,
 * a mesma origem.
 */
export function initRealtime(httpServer: HttpServer): IOServer {
  const io = new IOServer<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>(
    httpServer,
  );

  // Autenticação do handshake — rejeita conexão sem sessão válida.
  io.use((socket, next) => {
    void userIdFromCookieHeader(socket.handshake.headers.cookie).then((userId) => {
      if (!userId) return next(new Error("unauthorized"));
      socket.data.userId = userId;
      next();
    });
  });

  // workspaceId -> (userId -> nº de conexões abertas)
  const roomUsers = new Map<string, Map<string, number>>();
  const presenceList = (workspaceId: string): string[] => {
    const users = roomUsers.get(workspaceId);
    return users ? [...users.keys()] : [];
  };

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    let joined: string | null = null;

    // Room pessoal: destino das mensagens diretas (DM), entregues só aos
    // participantes — nunca à room do projeto. Ver event-dispatcher.
    socket.join(`user:${userId}`);

    const leave = () => {
      if (!joined) return;
      const workspaceId = joined;
      socket.leave(`workspace:${workspaceId}`);
      const users = roomUsers.get(workspaceId);
      if (users) {
        const remaining = (users.get(userId) ?? 1) - 1;
        if (remaining <= 0) users.delete(userId);
        else users.set(userId, remaining);
        if (users.size === 0) roomUsers.delete(workspaceId);
      }
      io.to(`workspace:${workspaceId}`).emit("presence:update", presenceList(workspaceId));
      joined = null;
    };

    socket.on("workspace:join", (payload: { workspaceId?: string }) => {
      const workspaceId = payload?.workspaceId;
      if (!workspaceId) return;
      joined = workspaceId;
      socket.join(`workspace:${workspaceId}`);
      const users = roomUsers.get(workspaceId) ?? new Map<string, number>();
      users.set(userId, (users.get(userId) ?? 0) + 1);
      roomUsers.set(workspaceId, users);
      io.to(`workspace:${workspaceId}`).emit("presence:update", presenceList(workspaceId));
    });

    socket.on("workspace:leave", (payload: { workspaceId?: string }) => {
      if (joined && joined === payload?.workspaceId) leave();
    });

    socket.on("disconnect", leave);
  });

  initEventDispatcher(io);
  initKanbanChatIntegration();
  console.log("▸ Realtime (Socket.io) inicializado no web");
  return io;
}
