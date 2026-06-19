import bcrypt from "bcryptjs";
import { prisma } from "../src/index";

// Seed idempotente: usuários/workspace via upsert; o conteúdo do projeto só é
// criado se ainda não existir, evitando duplicação a cada execução.
async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const ana = await prisma.user.upsert({
    where: { email: "ana@kerno.dev" },
    update: {},
    create: { name: "Ana Dev", email: "ana@kerno.dev", passwordHash },
  });
  const bruno = await prisma.user.upsert({
    where: { email: "bruno@kerno.dev" },
    update: {},
    create: { name: "Bruno Lima", email: "bruno@kerno.dev", passwordHash },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "kerno-demo" },
    update: {},
    create: { name: "Kerno Demo", slug: "kerno-demo" },
  });

  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: ana.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: ana.id, workspaceId: workspace.id, role: "ADMIN" },
  });
  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: bruno.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: bruno.id, workspaceId: workspace.id, role: "MEMBER" },
  });

  const projectName = "Onboarding do Kerno";
  const existing = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: projectName },
  });
  if (existing) {
    console.log("[seed] projeto demo já existe — nada a fazer.");
    console.log("[seed] login: ana@kerno.dev / password123");
    await prisma.$disconnect();
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: projectName,
      description: "Projeto de exemplo gerado pelo seed.",
      workspaceId: workspace.id,
      key: "ONB",
      users: {
        create: [
          { userId: ana.id, role: "LEAD" },
          { userId: bruno.id, role: "MEMBER" },
        ],
      },
      channels: {
        create: [{ name: "geral", isDefault: true }, { name: "releases" }],
      },
    },
  });

  const board = await prisma.board.create({
    data: {
      name: "Roadmap",
      projectId: project.id,
      columns: {
        create: [
          { name: "Backlog", order: 0, category: "BACKLOG" },
          { name: "A fazer", order: 1, category: "UNSTARTED" },
          { name: "Em progresso", order: 2, category: "STARTED" },
          { name: "Concluído", order: 3, category: "COMPLETED" },
          { name: "Cancelado", order: 4, category: "CANCELED" },
        ],
      },
    },
    include: { columns: true },
  });

  const columnByName = (name: string) => {
    const column = board.columns.find((c) => c.name === name);
    if (!column) throw new Error(`coluna ${name} não criada`);
    return column;
  };
  const todo = columnByName("A fazer");
  const doing = columnByName("Em progresso");
  const done = columnByName("Concluído");

  const [bug, feature, docs] = await Promise.all([
    prisma.label.create({ data: { boardId: board.id, name: "bug", color: "#ef4444" } }),
    prisma.label.create({ data: { boardId: board.id, name: "feature", color: "#6366f1" } }),
    prisma.label.create({ data: { boardId: board.id, name: "docs", color: "#22c55e" } }),
  ]);

  let cardNumber = 0;
  const card = (
    column: { id: string; category: string },
    order: number,
    title: string,
    assignedTo: string | null,
    labelIds: string[],
    description?: string,
  ) => {
    cardNumber += 1;
    return prisma.card.create({
      data: {
        number: cardNumber,
        title,
        description: description ?? null,
        columnId: column.id,
        boardId: board.id,
        order,
        assignedTo,
        labels: { create: labelIds.map((labelId) => ({ labelId })) },
        // Estado inicial no histórico (base p/ métricas de fluxo).
        statusEvents: {
          create: { toColumnId: column.id, category: column.category as never },
        },
      },
    });
  };

  await card(todo, 0, "Configurar ambiente local", bruno.id, [docs.id], "Node 20 + pnpm + Docker.");
  await card(todo, 1, "Desenhar tela de login", ana.id, [feature.id]);
  await card(doing, 0, "Corrigir drag-and-drop em telas pequenas", ana.id, [bug.id]);
  await card(done, 0, "Setup do monorepo", bruno.id, [feature.id]);

  // Sincroniza o contador de cards do projeto com os cards já criados.
  await prisma.project.update({
    where: { id: project.id },
    data: { cardCounter: cardNumber },
  });

  const general = await prisma.channel.findFirstOrThrow({
    where: { projectId: project.id, isDefault: true },
  });
  await prisma.message.createMany({
    data: [
      { channelId: general.id, userId: ana.id, content: "Bem-vindos ao Kerno! 🚀" },
      { channelId: general.id, userId: bruno.id, content: "Animado pra começar 👏" },
    ],
  });

  console.log("[seed] criado workspace 'Kerno Demo' + projeto 'Onboarding do Kerno'.");
  console.log("[seed] login: ana@kerno.dev / password123  (e bruno@kerno.dev / password123)");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
