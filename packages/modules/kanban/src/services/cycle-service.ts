import { prisma } from "@kerno/db";

export async function createCycle(
  projectId: string,
  name: string,
  startsAt: Date,
  endsAt: Date,
) {
  return prisma.cycle.create({ data: { projectId, name, startsAt, endsAt } });
}

export async function deleteCycle(cycleId: string) {
  // Cards mantêm-se (cycleId vira null via onDelete: SetNull no schema).
  return prisma.cycle.delete({ where: { id: cycleId } });
}

export async function projectIdOfCycle(cycleId: string): Promise<string | null> {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: { projectId: true },
  });
  return cycle?.projectId ?? null;
}
