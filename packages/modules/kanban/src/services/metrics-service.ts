import { prisma } from "@kerno/db";
import type { BoardMetricsDTO } from "../types";

const DAY_MS = 86_400_000;

/** Segunda-feira (00:00) da semana de `d`, como Date. */
function weekStartDate(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const mondayOffset = (x.getDay() + 6) % 7; // Dom=6, Seg=0
  x.setDate(x.getDate() - mondayOffset);
  return x;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** As N semanas mais recentes (inclui a atual), em ordem cronológica. */
function lastNWeeks(n: number): string[] {
  const cur = weekStartDate(new Date());
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(cur);
    d.setDate(d.getDate() - i * 7);
    out.push(isoDay(d));
  }
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Métricas de fluxo do board derivadas do histórico de estado (CardStatusEvent):
 * cycle time (1º STARTED → 1º COMPLETED), lead time (criação → 1º COMPLETED),
 * throughput semanal (concluídos/semana) e WIP atual (cards em colunas STARTED).
 */
export async function getBoardMetrics(boardId: string): Promise<BoardMetricsDTO> {
  const [columns, cards] = await Promise.all([
    prisma.column.findMany({ where: { boardId }, select: { id: true, category: true } }),
    prisma.card.findMany({ where: { boardId }, select: { id: true, createdAt: true, columnId: true } }),
  ]);

  const startedColumns = new Set(
    columns.filter((c) => c.category === "STARTED").map((c) => c.id),
  );
  const createdAtById = new Map(cards.map((c) => [c.id, c.createdAt]));

  const events = await prisma.cardStatusEvent.findMany({
    where: { cardId: { in: cards.map((c) => c.id) } },
    orderBy: { at: "asc" },
    select: { cardId: true, category: true, at: true },
  });

  // Primeiro STARTED e primeiro COMPLETED de cada card (eventos já ordenados por `at`).
  const firstStarted = new Map<string, Date>();
  const firstCompleted = new Map<string, Date>();
  for (const e of events) {
    if (e.category === "STARTED" && !firstStarted.has(e.cardId)) firstStarted.set(e.cardId, e.at);
    if (e.category === "COMPLETED" && !firstCompleted.has(e.cardId)) {
      firstCompleted.set(e.cardId, e.at);
    }
  }

  let cycleSum = 0;
  let cycleN = 0;
  let leadSum = 0;
  let leadN = 0;
  const throughput = new Map<string, number>();

  for (const [cardId, completedAt] of firstCompleted) {
    const created = createdAtById.get(cardId);
    if (created) {
      leadSum += (completedAt.getTime() - created.getTime()) / DAY_MS;
      leadN += 1;
    }
    const started = firstStarted.get(cardId);
    if (started && started.getTime() <= completedAt.getTime()) {
      cycleSum += (completedAt.getTime() - started.getTime()) / DAY_MS;
      cycleN += 1;
    }
    const wk = isoDay(weekStartDate(completedAt));
    throughput.set(wk, (throughput.get(wk) ?? 0) + 1);
  }

  return {
    completedCount: firstCompleted.size,
    wip: cards.filter((c) => startedColumns.has(c.columnId)).length,
    avgCycleTimeDays: cycleN > 0 ? round1(cycleSum / cycleN) : null,
    avgLeadTimeDays: leadN > 0 ? round1(leadSum / leadN) : null,
    throughput: lastNWeeks(8).map((weekStart) => ({
      weekStart,
      count: throughput.get(weekStart) ?? 0,
    })),
  };
}
