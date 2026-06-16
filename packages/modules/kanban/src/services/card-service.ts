import { prisma } from "@kerno/db";
import { eventBus, createEvent } from "@kerno/core/events";

export async function createCard(columnId: string, title: string, actorId: string) {
  const column = await prisma.column.findUniqueOrThrow({
    where: { id: columnId },
    select: { boardId: true, board: { select: { projectId: true } } },
  });
  const order = await prisma.card.count({ where: { columnId } });

  const card = await prisma.card.create({
    data: { columnId, boardId: column.boardId, title, order },
  });

  eventBus.publish(
    createEvent(
      "card:created",
      column.board.projectId,
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
  },
  actorId: string,
) {
  const existing = await prisma.card.findUniqueOrThrow({
    where: { id: input.cardId },
    select: { boardId: true, assignedTo: true, board: { select: { projectId: true } } },
  });

  const card = await prisma.$transaction(async (tx) => {
    const updated = await tx.card.update({
      where: { id: input.cardId },
      data: {
        title: input.title,
        description: input.description,
        assignedTo: input.assignedTo,
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
        existing.board.projectId,
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
    select: { title: true, boardId: true, board: { select: { projectId: true } } },
  });

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
  ]);

  eventBus.publish(
    createEvent(
      "card:moved",
      card.board.projectId,
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
    select: { title: true, boardId: true, board: { select: { projectId: true } } },
  });

  await prisma.card.delete({ where: { id: cardId } });

  eventBus.publish(
    createEvent(
      "card:deleted",
      card.board.projectId,
      { cardId, boardId: card.boardId, title: card.title },
      actorId,
    ),
  );
}
