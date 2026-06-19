import "./env";
import "reflect-metadata";
import type { Server as HttpServer } from "node:http";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { initRealtime } from "./realtime/socket";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  // Socket.io anexado ao mesmo HTTP server + dispatcher do event bus.
  initRealtime(app.getHttpServer() as HttpServer);

  // API_PORT é explícito no dev local (evita colidir com o web). Em hosts como o
  // Railway, que injetam PORT dinamicamente, caímos para PORT. Escuta em 0.0.0.0
  // para ser acessível no container.
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3333);
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`▸ Kerno API ouvindo na porta ${port} (prefixo /api)`);
}

void bootstrap();
