import { prisma } from "@kerno/db";
import { eventBus, createEvent } from "@kerno/core/events";

/** Resolve o contexto (board/project) de um card e publica o resync do Kanban. */
async function notifyCard(cardId: string, actorId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { boardId: true, board: { select: { projectId: true } } },
  });
  if (!card) return;
  eventBus.publish(
    createEvent("kanban:changed", card.board.projectId, { boardId: card.boardId, cardId }, actorId),
  );
}

/** Cria uma nova todolist no card, posicionada ao final. */
export async function createChecklist(cardId: string, title: string | null, actorId: string) {
  const count = await prisma.checklist.count({ where: { cardId } });
  const checklist = await prisma.checklist.create({
    data: { cardId, title: title || null, order: count },
  });
  await notifyCard(cardId, actorId);
  return checklist;
}

export async function renameChecklist(checklistId: string, title: string | null, actorId: string) {
  const checklist = await prisma.checklist.update({
    where: { id: checklistId },
    data: { title: title || null },
    select: { cardId: true },
  });
  await notifyCard(checklist.cardId, actorId);
}

export async function deleteChecklist(checklistId: string, actorId: string): Promise<void> {
  const checklist = await prisma.checklist.delete({
    where: { id: checklistId },
    select: { cardId: true },
  });
  await notifyCard(checklist.cardId, actorId);
}

/** Adiciona um item ao final da todolist. */
export async function addChecklistItem(checklistId: string, text: string, actorId: string) {
  const count = await prisma.checklistItem.count({ where: { checklistId } });
  const item = await prisma.checklistItem.create({
    data: { checklistId, text, order: count },
    select: { id: true, checklist: { select: { cardId: true } } },
  });
  await notifyCard(item.checklist.cardId, actorId);
  return item;
}

export async function toggleChecklistItem(itemId: string, done: boolean, actorId: string) {
  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: { done },
    select: { checklist: { select: { cardId: true } } },
  });
  await notifyCard(item.checklist.cardId, actorId);
}

export async function updateChecklistItem(itemId: string, text: string, actorId: string) {
  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: { text },
    select: { checklist: { select: { cardId: true } } },
  });
  await notifyCard(item.checklist.cardId, actorId);
}

export async function deleteChecklistItem(itemId: string, actorId: string): Promise<void> {
  const item = await prisma.checklistItem.delete({
    where: { id: itemId },
    select: { checklist: { select: { cardId: true } } },
  });
  await notifyCard(item.checklist.cardId, actorId);
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
