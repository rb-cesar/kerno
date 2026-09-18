import { prisma } from "@/core/db";

export class CycleDomain {
  async createCycle(workspaceId: string, name: string, startsAt: Date, endsAt: Date) {
    return prisma.cycle.create({ data: { workspaceId, name, startsAt, endsAt } });
  }

  async deleteCycle(cycleId: string) {
    // Cards mantêm-se (cycleId vira null via onDelete: SetNull no schema).
    return prisma.cycle.delete({ where: { id: cycleId } });
  }

  async workspaceIdOfCycle(cycleId: string): Promise<string | null> {
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      select: { workspaceId: true },
    });
    return cycle?.workspaceId ?? null;
  }
}

export function createCycleDomain(): CycleDomain {
  return new CycleDomain();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const cycle = createCycleDomain();
