import { prisma } from "@kerno/db";

/** Cria uma nova todolist no card, posicionada ao final. */
export async function createChecklist(cardId: string, title: string | null) {
  const count = await prisma.checklist.count({ where: { cardId } });
  return prisma.checklist.create({ data: { cardId, title: title || null, order: count } });
}

export async function renameChecklist(checklistId: string, title: string | null) {
  return prisma.checklist.update({
    where: { id: checklistId },
    data: { title: title || null },
  });
}

export async function deleteChecklist(checklistId: string): Promise<void> {
  await prisma.checklist.delete({ where: { id: checklistId } });
}

/** Adiciona um item ao final da todolist. */
export async function addChecklistItem(checklistId: string, text: string) {
  const count = await prisma.checklistItem.count({ where: { checklistId } });
  return prisma.checklistItem.create({ data: { checklistId, text, order: count } });
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  return prisma.checklistItem.update({ where: { id: itemId }, data: { done } });
}

export async function updateChecklistItem(itemId: string, text: string) {
  return prisma.checklistItem.update({ where: { id: itemId }, data: { text } });
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  await prisma.checklistItem.delete({ where: { id: itemId } });
}

/** Card dono de uma checklist — usado pela camada de permissão. */
export async function cardIdOfChecklist(checklistId: string): Promise<string | null> {
  const c = await prisma.checklist.findUnique({
    where: { id: checklistId },
    select: { cardId: true },
  });
  return c?.cardId ?? null;
}

/** Card dono de um item de checklist — usado pela camada de permissão. */
export async function cardIdOfChecklistItem(itemId: string): Promise<string | null> {
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    select: { checklist: { select: { cardId: true } } },
  });
  return item?.checklist.cardId ?? null;
}
