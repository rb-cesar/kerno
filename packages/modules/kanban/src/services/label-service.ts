import { prisma } from "@kerno/db";

export async function createLabel(boardId: string, name: string, color: string) {
  return prisma.label.create({ data: { boardId, name, color } });
}

export async function deleteLabel(labelId: string) {
  return prisma.label.delete({ where: { id: labelId } });
}
