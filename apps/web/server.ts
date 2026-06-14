import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { initEventDispatcher } from "./lib/events/dispatcher";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// projectId -> (userId -> nº de conexões abertas)
const roomUsers = new Map<string, Map<string, number>>();

function presenceList(projectId: string): string[] {
  const users = roomUsers.get(projectId);
  return users ? [...users.keys()] : [];
}

async function main() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on("connection", (socket) => {
    let joined: { projectId: string; userId: string } | null = null;

    const leave = () => {
      if (!joined) return;
      const { projectId, userId } = joined;
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

    socket.on("project:join", (payload: { projectId?: string; userId?: string }) => {
      const { projectId, userId } = payload ?? {};
      if (!projectId || !userId) return;
      joined = { projectId, userId };
      socket.join(`project:${projectId}`);
      const users = roomUsers.get(projectId) ?? new Map<string, number>();
      users.set(userId, (users.get(userId) ?? 0) + 1);
      roomUsers.set(projectId, users);
      io.to(`project:${projectId}`).emit("presence:update", presenceList(projectId));
    });

    socket.on("project:leave", (payload: { projectId?: string }) => {
      if (joined && joined.projectId === payload?.projectId) leave();
    });

    socket.on("disconnect", leave);
  });

  // Disponibiliza o io e liga o event bus -> (persistência + realtime).
  (globalThis as unknown as { kernoIo?: SocketIOServer }).kernoIo = io;
  initEventDispatcher(io);

  httpServer.listen(port, () => {
    console.log(`▸ Kerno pronto em http://${hostname}:${port}  (dev=${dev})`);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar o servidor Kerno:", err);
  process.exit(1);
});
