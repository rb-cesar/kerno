import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { initRealtime } from "./src/server/realtime";

// Servidor custom: hospeda o Next E o Socket.io no mesmo processo/porta — web,
// API (Hono, via route handler) e realtime são uma coisa só.
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  initRealtime(httpServer);

  httpServer.listen(port, () => {
    console.log(`▸ Kerno web pronto em http://${hostname}:${port}  (dev=${dev})`);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar o web Kerno:", err);
  process.exit(1);
});
