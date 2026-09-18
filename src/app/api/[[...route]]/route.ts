import { handle } from "hono/vercel";
import { createApi } from "@/server/api";

// Toda leitura passa por Prisma/sessão — nada aqui é estático.
export const dynamic = "force-dynamic";

const app = createApi();

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
