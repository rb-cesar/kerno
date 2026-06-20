import { prisma } from "@kerno/db";

export async function createCycle(
  workspaceId: string,
  name: string,
  startsAt: Date,
  endsAt: Date,
) {
  return prisma.cycle.create({ data: { workspaceId, name, startsAt, endsAt } });
}

export async function deleteCycle(cycleId: string) {
  // Cards mantêm-se (cycleId vira null via onDelete: SetNull no schema).
  return prisma.cycle.delete({ where: { id: cycleId } });
}

export async function workspaceIdOfCycle(cycleId: string): Promise<string | null> {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: { workspaceId: true },
  });
  return cycle?.workspaceId ?? null;
}
