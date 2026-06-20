import bcrypt from "bcryptjs";
import { prisma } from "../src/index";

// Script avulso (não faz parte do seed): adiciona usuários de teste ao workspace
// "kerno-demo" e popula o board com cards variados. Idempotente — re-rodar não
// duplica usuários/membros, e os cards extras só são criados uma vez.
async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const workspace = await prisma.workspace.findUnique({ where: { slug: "kerno-demo" } });
  if (!workspace) throw new Error("workspace kerno-demo não encontrado — rode o seed antes");

  const board = await prisma.board.findFirstOrThrow({ where: { workspaceId: workspace.id } });
  const columns = await prisma.column.findMany({ where: { boardId: board.id } });
  const col = (name: string) => {
    const c = columns.find((x) => x.name === name);
    if (!c) throw new Error(`coluna ${name} não encontrada`);
    return c;
  };

  // ── Usuários ───────────────────────────────────────────────────────────────
  // role = papel no workspace (ADMIN / MEMBER / VIEWER).
  const people = [
    { name: "Carla Souza", email: "carla@kerno.dev", role: "ADMIN" as const },
    { name: "Diego Alves", email: "diego@kerno.dev", role: "MEMBER" as const },
    { name: "Elena Costa", email: "elena@kerno.dev", role: "MEMBER" as const },
    { name: "Felipe Rocha", email: "felipe@kerno.dev", role: "VIEWER" as const },
  ];

  const userByEmail: Record<string, string> = {};
  for (const p of people) {
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { name: p.name, email: p.email, passwordHash },
    });
    userByEmail[p.email] = u.id;
    await prisma.workspaceUser.upsert({
      where: { userId_workspaceId: { userId: u.id, workspaceId: workspace.id } },
      update: { role: p.role },
      create: { userId: u.id, workspaceId: workspace.id, role: p.role },
    });
  }

  const ana = await prisma.user.findUniqueOrThrow({ where: { email: "ana@kerno.dev" } });
  const bruno = await prisma.user.findUniqueOrThrow({ where: { email: "bruno@kerno.dev" } });
  const carla = userByEmail["carla@kerno.dev"];
  const diego = userByEmail["diego@kerno.dev"];
  const elena = userByEmail["elena@kerno.dev"];

  // Já populado? (marcador) — evita duplicar os cards extras a cada execução.
  const MARKER = "Integrar login com GitHub";
  const already = await prisma.card.findFirst({ where: { boardId: board.id, title: MARKER } });
  if (already) {
    console.log("[populate] board já populado — só garanti os usuários/membros.");
    console.log("[populate] contas: " + people.map((p) => p.email).join(", "));
    await prisma.$disconnect();
    return;
  }

  // ── Labels extras ────────────────────────────────────────────────────────────
  const ensureLabel = async (name: string, color: string) =>
    (await prisma.label.findFirst({ where: { boardId: board.id, name } })) ??
    (await prisma.label.create({ data: { boardId: board.id, name, color } }));
  const bug = await ensureLabel("bug", "#ef4444");
  const feature = await ensureLabel("feature", "#6366f1");
  const docs = await ensureLabel("docs", "#22c55e");
  const chore = await ensureLabel("chore", "#a855f7");
  const design = await ensureLabel("design", "#ec4899");

  // ── Cycle (sprint atual) ─────────────────────────────────────────────────────
  const now = new Date();
  const cycle = await prisma.cycle.create({
    data: {
      workspaceId: workspace.id,
      name: "Sprint 1",
      startsAt: now,
      endsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Stories (épicos) ─────────────────────────────────────────────────────────
  const storyAuth = await prisma.story.create({
    data: { boardId: board.id, number: 1, title: "Autenticação", status: "STARTED", order: 0, priority: "HIGH", color: "#6366f1" },
  });
  const storyUX = await prisma.story.create({
    data: { boardId: board.id, number: 2, title: "Onboarding UX", status: "UNSTARTED", order: 1, priority: "MEDIUM", color: "#ec4899" },
  });

  // ── Cards ────────────────────────────────────────────────────────────────────
  // Continua a numeração a partir do contador atual do workspace.
  let counter = workspace.cardCounter;
  const orderByCol: Record<string, number> = {};
  for (const c of columns) {
    orderByCol[c.id] = await prisma.card.count({ where: { columnId: c.id } });
  }

  const day = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  type Spec = {
    column: string;
    title: string;
    description?: string;
    assignedTo?: string | null;
    labels?: { id: string }[];
    priority?: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate?: Date | null;
    estimate?: number | null;
    cycleId?: string | null;
    storyId?: string | null;
  };

  const specs: Spec[] = [
    // Backlog
    { column: "Backlog", title: "Pesquisar provedores de e-mail transacional", priority: "LOW", labels: [chore], assignedTo: diego, estimate: 2 },
    { column: "Backlog", title: "Especificar permissões por papel (ADMIN/MEMBER/VIEWER)", priority: "MEDIUM", labels: [docs], assignedTo: carla, storyId: storyAuth.id },
    { column: "Backlog", title: "Wireframe do onboarding em 3 passos", priority: "MEDIUM", labels: [design], assignedTo: elena, storyId: storyUX.id, estimate: 3 },
    { column: "Backlog", title: "Auditar dependências desatualizadas", priority: "LOW", labels: [chore], assignedTo: bruno.id, estimate: 1 },
    // A fazer
    { column: "A fazer", title: MARKER, description: "OAuth com GitHub para login social.", priority: "HIGH", labels: [feature], assignedTo: carla, cycleId: cycle.id, storyId: storyAuth.id, estimate: 5, dueDate: day(5) },
    { column: "A fazer", title: "Tela de convite de membros", priority: "MEDIUM", labels: [feature], assignedTo: ana.id, cycleId: cycle.id, storyId: storyUX.id, estimate: 3, dueDate: day(7) },
    { column: "A fazer", title: "Validação de formulário no cadastro", priority: "MEDIUM", labels: [feature, bug], assignedTo: diego, cycleId: cycle.id, estimate: 2 },
    // Em progresso
    { column: "Em progresso", title: "Refresh token + expiração de sessão", priority: "URGENT", labels: [feature], assignedTo: carla, cycleId: cycle.id, storyId: storyAuth.id, estimate: 5, dueDate: day(2) },
    { column: "Em progresso", title: "Componente de avatar com presença online", priority: "LOW", labels: [design], assignedTo: elena, cycleId: cycle.id, estimate: 2 },
    // Concluído
    { column: "Concluído", title: "Hash de senha com bcrypt", priority: "HIGH", labels: [feature], assignedTo: bruno.id, storyId: storyAuth.id, estimate: 2 },
    { column: "Concluído", title: "Layout base com tema escuro", priority: "MEDIUM", labels: [design], assignedTo: ana.id, estimate: 3 },
    { column: "Concluído", title: "Escrever README de setup local", priority: "LOW", labels: [docs], assignedTo: diego, estimate: 1 },
    // Cancelado
    { column: "Cancelado", title: "Login por magic link (adiado)", priority: "NONE", labels: [feature], assignedTo: null },
  ];

  for (const s of specs) {
    const column = col(s.column);
    counter += 1;
    const order = orderByCol[column.id]++;
    await prisma.card.create({
      data: {
        number: counter,
        title: s.title,
        description: s.description ?? null,
        columnId: column.id,
        boardId: board.id,
        order,
        assignedTo: s.assignedTo ?? null,
        priority: s.priority ?? "NONE",
        dueDate: s.dueDate ?? null,
        estimate: s.estimate ?? null,
        cycleId: s.cycleId ?? null,
        storyId: s.storyId ?? null,
        labels: { create: (s.labels ?? []).map((l) => ({ labelId: l.id })) },
        statusEvents: { create: { toColumnId: column.id, category: column.category as never, actorId: ana.id } },
      },
    });
  }

  await prisma.workspace.update({ where: { id: workspace.id }, data: { cardCounter: counter } });

  console.log(`[populate] +${specs.length} cards, 1 cycle, 2 stories, ${people.length} usuários.`);
  console.log("[populate] contas (senha = password123): " + people.map((p) => p.email).join(", "));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
