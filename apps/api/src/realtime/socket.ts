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
 * o userId vem do token, nÃ£o mais do cliente.
 */
export function initRealtime(httpServer: HttpServer): IOServer {
  const jwt = new JwtService({ secret: process.env.AUTH_SECRET });

  const io = new IOServer<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>(
    httpServer,
    { cors: { origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true } },
  );

  // AutenticaÃ§Ã£o do handshake â€” rejeita conexÃ£o sem token vÃ¡lido.
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

  // workspaceId -> (userId -> nÂº de conexÃµes abertas)
  const roomUsers = new Map<string, Map<string, number>>();
  const presenceList = (workspaceId: string): string[] => {
    const users = roomUsers.get(workspaceId);
    return users ? [...users.keys()] : [];
  };

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    let joined: string | null = null;

    // Room pessoal: destino das mensagens diretas (DM), entregues sÃ³ aos
    // participantes â€” nunca Ã  room do projeto. Ver event-dispatcher.
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
  console.log("â–¸ Realtime (Socket.io) inicializado na API");
  return io;
}
