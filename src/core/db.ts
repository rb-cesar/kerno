import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7: instanciação exige um driver adapter explícito — sem timeout
// padrão de conexão (diferente do engine embutido do v6, que tinha 5s).
// SSL só em produção — o `pg` (por trás do adapter) não negocia SSL sozinho
// a partir da connection string (diferente do engine do `prisma db push`),
// e o Postgres do Render fecha a conexão sem isso. O Postgres local do
// docker-compose não tem SSL configurado, por isso fica de fora em dev.
// rejectUnauthorized:false porque o certificado do Postgres do Render não
// tem cadeia verificável pelas CAs padrão do Node — o tráfego continua
// criptografado, só não valida a cadeia (igual à recomendação do próprio
// Render pra clientes Node/pg).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@/generated/prisma/client";
