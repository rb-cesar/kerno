import { prisma } from "@/core/db";

export class LabelDomain {
  async createLabel(boardId: string, name: string, color: string) {
    return prisma.label.create({ data: { boardId, name, color } });
  }

  async deleteLabel(labelId: string) {
    return prisma.label.delete({ where: { id: labelId } });
  }
}

export function createLabelDomain(): LabelDomain {
  return new LabelDomain();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const label = createLabelDomain();
