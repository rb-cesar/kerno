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

  const port = Number(process.env.API_PORT ?? 3333);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`▸ Kerno API em http://localhost:${port}/api`);
}

void bootstrap();
