import { prisma } from "../src/index";

// Seed real (usuário demo, workspace, board, cards, canal) chega na Fase 4.
// Por enquanto é um stub seguro e idempotente.
async function main() {
  const count = await prisma.user.count();
  console.log(`[seed] conectado ao banco. Usuários existentes: ${count}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
