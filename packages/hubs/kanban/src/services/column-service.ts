import { prisma } from "@kerno/db";

export async function createColumn(boardId: string, name: string) {
  const order = await prisma.column.count({ where: { boardId } });
  return prisma.column.create({ data: { boardId, name, order } });
}

export async function renameColumn(columnId: string, name: string) {
  return prisma.column.update({ where: { id: columnId }, data: { name } });
}

export async function deleteColumn(columnId: string) {
  // Cards são removidos em cascata (onDelete: Cascade no schema).
  return prisma.column.delete({ where: { id: columnId } });
}
