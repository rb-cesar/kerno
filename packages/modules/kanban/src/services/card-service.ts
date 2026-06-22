import { prisma } from "@kerno/db";
import { eventBus, createEvent } from "@kerno/core/events";
import type { Priority } from "../types";

/** Máximo de tarefas (cards) por board. */
export const MAX_CARDS_PER_BOARD = 1000;

export async function createCard(
  columnId: string,
  title: string,
  actorId: string,
  parentId: string | null = null,
) {
  const column = await prisma.column.findUniqueOrThrow({
    where: { id: columnId },
    select: { boardId: true, category: true, board: { select: { workspaceId: true } } },
  });

  const cardsInBoard = await prisma.card.count({ where: { boardId: column.boardId } });
  if (cardsInBoard >= MAX_CARDS_PER_BOARD) {
    throw new Error(`Limite de ${MAX_CARDS_PER_BOARD} tarefas por board atingido.`);
  }

  const order = await prisma.card.count({ where: { columnId } });

  // Numera o card (sequência por workspace) e registra o estado inicial — tudo numa
  // transação para a contagem não correr risco de duplicar sob concorrência.
  const card = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.update({
      where: { id: column.board.workspaceId },
      data: { cardCounter: { increment: 1 } },
      select: { cardCounter: true },
    });
    const created = await tx.card.create({
      data: {
        columnId,
        boardId: column.boardId,
        title,
        order,
        number: workspace.cardCounter,
        parentId,
      },
    });
    await tx.cardStatusEvent.create({
      data: { cardId: created.id, toColumnId: columnId, category: column.category, actorId },
    });
    return created;
  });

  eventBus.publish(
    createEvent(
      "card:created",
      column.board.workspaceId,
      { cardId: card.id, boardId: column.boardId, columnId, title: card.title },
      actorId,
    ),
  );

  return card;
}

export async function updateCard(
  input: {
    cardId: string;
    title: string;
    description: string | null;
    assignedTo: string | null;
    labelIds: string[];
    priority: Priority;
    dueDate: Date | null;
    estimate: number | null;
    cycleId: string | null;
    storyId: string | null;
  },
  actorId: string,
) {
  const existing = await prisma.card.findUniqueOrThrow({
    where: { id: input.cardId },
    select: { boardId: true, assignedTo: true, board: { select: { workspaceId: true } } },
  });

  const card = await prisma.$transaction(async (tx) => {
    const updated = await tx.card.update({
      where: { id: input.cardId },
      data: {
        title: input.title,
        description: input.description,
        assignedTo: input.assignedTo,
        priority: input.priority,
        dueDate: input.dueDate,
        estimate: input.estimate,
        cycleId: input.cycleId,
        storyId: input.storyId,
      },
    });
    await tx.cardLabel.deleteMany({ where: { cardId: input.cardId } });
    if (input.labelIds.length > 0) {
      await tx.cardLabel.createMany({
        data: input.labelIds.map((labelId) => ({ cardId: input.cardId, labelId })),
      });
    }
    return updated;
  });

  if (existing.assignedTo !== input.assignedTo) {
    eventBus.publish(
      createEvent(
        "card:assigned",
        existing.board.workspaceId,
        {
          cardId: input.cardId,
          boardId: existing.boardId,
          assignedTo: input.assignedTo,
          title: input.title,
        },
        actorId,
      ),
    );
  }

  // Resync genérico (cobre edição de campos + vínculo com story) p/ outros clientes.
  eventBus.publish(
    createEvent(
      "kanban:changed",
      existing.board.workspaceId,
      { boardId: existing.boardId, cardId: input.cardId },
      actorId,
    ),
  );

  return card;
}

export async function moveCard(
  input: {
    cardId: string;
    fromColumnId: string;
    toColumnId: string;
    destCardIds: string[];
    sourceCardIds: string[];
  },
  actorId: string,
) {
  const card = await prisma.card.findUniqueOrThrow({
    where: { id: input.cardId },
    select: { title: true, boardId: true, board: { select: { workspaceId: true } } },
  });

  const changedColumn = input.fromColumnId !== input.toColumnId;
  // Categoria do estado de destino — registrada no histórico p/ métricas (F6).
  const toColumn = changedColumn
    ? await prisma.column.findUniqueOrThrow({
        where: { id: input.toColumnId },
        select: { category: true },
      })
    : null;

  await prisma.$transaction([
    ...input.destCardIds.map((id, index) =>
      prisma.card.update({
        where: { id },
        data: { columnId: input.toColumnId, order: index },
      }),
    ),
    ...input.sourceCardIds.map((id, index) =>
      prisma.card.update({
        where: { id },
        data: { columnId: input.fromColumnId, order: index },
      }),
    ),
    ...(toColumn
      ? [
          prisma.cardStatusEvent.create({
            data: {
              cardId: input.cardId,
              fromColumnId: input.fromColumnId,
              toColumnId: input.toColumnId,
              category: toColumn.category,
              actorId,
            },
          }),
        ]
      : []),
  ]);

  eventBus.publish(
    createEvent(
      "card:moved",
      card.board.workspaceId,
      {
        cardId: input.cardId,
        boardId: card.boardId,
        fromColumnId: input.fromColumnId,
        toColumnId: input.toColumnId,
        title: card.title,
      },
      actorId,
    ),
  );
}

export async function deleteCard(cardId: string, actorId: string) {
  const card = await prisma.card.findUniqueOrThrow({
    where: { id: cardId },
    select: { title: true, boardId: true, board: { select: { workspaceId: true } } },
  });

  await prisma.card.delete({ where: { id: cardId } });

  eventBus.publish(
    createEvent(
      "card:deleted",
      card.board.workspaceId,
      { cardId, boardId: card.boardId, title: card.title },
      actorId,
    ),
  );
}
