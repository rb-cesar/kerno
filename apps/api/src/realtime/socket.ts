import type { Server as HttpServer } from "node:http";
import { JwtService } from "@nestjs/jwt";
import { Server as IOServer } from "socket.io";
import { initEventDispatcher } from "../composition/event-dispatcher";
import { initKanbanChatIntegration } from "../composition/kanban-chat";

interface SocketData {
  userId: string;
}

/**
 * Sobe o Socket.io anexado ao HTTP server da API e liga o event bus ao realtime.
 * Migrado de apps/web/server.ts. Handshake autenticado por JWT (mesmo AUTH_SECRET):
 * o userId vem do token, não mais do cliente.
 */
export function initRealtime(httpServer: HttpServer): IOServer {
  const jwt = new JwtService({ secret: process.env.AUTH_SECRET });

  const io = new IOServer<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>(
    httpServer,
    { cors: { origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true } },
  );

  // Autenticação do handshake — rejeita conexão sem token válido.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = jwt.verify<{ sub: string }>(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  // projectId -> (userId -> nº de conexões abertas)
  const roomUsers = new Map<string, Map<string, number>>();
  const presenceList = (projectId: string): string[] => {
    const users = roomUsers.get(projectId);
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
      const projectId = joined;
      socket.leave(`project:${projectId}`);
      const users = roomUsers.get(projectId);
      if (users) {
        const remaining = (users.get(userId) ?? 1) - 1;
        if (remaining <= 0) users.delete(userId);
        else users.set(userId, remaining);
        if (users.size === 0) roomUsers.delete(projectId);
      }
      io.to(`project:${projectId}`).emit("presence:update", presenceList(projectId));
      joined = null;
    };

    socket.on("project:join", (payload: { projectId?: string }) => {
      const projectId = payload?.projectId;
      if (!projectId) return;
      joined = projectId;
      socket.join(`project:${projectId}`);
      const users = roomUsers.get(projectId) ?? new Map<string, number>();
      users.set(userId, (users.get(userId) ?? 0) + 1);
      roomUsers.set(projectId, users);
      io.to(`project:${projectId}`).emit("presence:update", presenceList(projectId));
    });

    socket.on("project:leave", (payload: { projectId?: string }) => {
      if (joined && joined === payload?.projectId) leave();
    });

    socket.on("disconnect", leave);
  });

  initEventDispatcher(io);
  initKanbanChatIntegration();
  console.log("▸ Realtime (Socket.io) inicializado na API");
  return io;
}
