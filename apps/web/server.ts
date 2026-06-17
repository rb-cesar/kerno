import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";

// O web não hospeda mais Socket.io — o realtime mora na API (NestJS). Este
// servidor custom só entrega o Next. (Poderia voltar a ser `next start`; mantido
// fino para não mexer nos scripts dev/start.)
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

  httpServer.listen(port, () => {
    console.log(`▸ Kerno web pronto em http://${hostname}:${port}  (dev=${dev})`);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar o web Kerno:", err);
  process.exit(1);
});
