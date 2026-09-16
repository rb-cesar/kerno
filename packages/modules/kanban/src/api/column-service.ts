import { prisma } from "@kerno/db";
import type { StatusCategory } from "../types";

export async function createColumn(
  boardId: string,
  name: string,
  category: StatusCategory = "UNSTARTED",
) {
  const order = await prisma.column.count({ where: { boardId } });
  return prisma.column.create({ data: { boardId, name, order, category } });
}

export async function renameColumn(columnId: string, name: string) {
  return prisma.column.update({ where: { id: columnId }, data: { name } });
}

export async function updateColumn(
  columnId: string,
  input: { name: string; category: StatusCategory; wipLimit: number | null },
) {
  return prisma.column.update({
    where: { id: columnId },
    data: { name: input.name, category: input.category, wipLimit: input.wipLimit },
  });
}

export async function reorderColumns(boardId: string, columnIds: string[]) {
  // updateMany com `boardId` no where garante que só colunas DESTE board sejam
  // reordenadas (ignora ids de outros boards).
  await prisma.$transaction(
    columnIds.map((id, index) =>
      prisma.column.updateMany({ where: { id, boardId }, data: { order: index } }),
    ),
  );
}

export async function deleteColumn(columnId: string) {
  // Cards são removidos em cascata (onDelete: Cascade no schema).
  return prisma.column.delete({ where: { id: columnId } });
}
