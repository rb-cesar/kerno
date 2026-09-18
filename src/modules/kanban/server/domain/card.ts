import { prisma } from "@/core/db";
import { RuleViolation } from "@/core/errors";
import { createEvent, eventBus } from "@/core/events";
import type { Priority } from "../../types";

/** Máximo de tarefas (cards) por board. */
export const MAX_CARDS_PER_BOARD = 1000;

export class CardDomain {
  async createCard(columnId: string, title: string, actorId: string, parentId: string | null = null) {
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

  async updateCard(
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

    // Os três campos abaixo são referência livre (id de outra tabela) vinda do
    // client — sem checar aqui, um membro de QUALQUER workspace podia vincular
    // este card a uma label/cycle/story de um board que não é o dele (a FK do
    // Prisma só garante que o id existe em algum lugar, não que é do mesmo dono).
    if (input.labelIds.length > 0) {
      const owned = await prisma.label.count({
        where: { id: { in: input.labelIds }, boardId: existing.boardId },
      });
      if (owned !== input.labelIds.length) throw new RuleViolation("Etiqueta de outro board");
    }
    if (input.cycleId) {
      const cycle = await prisma.cycle.findUnique({
        where: { id: input.cycleId },
        select: { workspaceId: true },
      });
      if (!cycle || cycle.workspaceId !== existing.board.workspaceId) {
        throw new RuleViolation("Cycle de outro workspace");
      }
    }
    if (input.storyId) {
      const story = await prisma.story.findUnique({
        where: { id: input.storyId },
        select: { boardId: true },
      });
      if (!story || story.boardId !== existing.boardId) {
        throw new RuleViolation("História de outro board");
      }
    }

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

  async moveCard(
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

    // destCardIds/sourceCardIds vêm do client (a ordem da coluna depois do
    // drag) — sem checar, um id de card de outro board seria movido junto
    // (é um prisma.card.update por id, não um updateMany filtrado por board).
    const reorderedIds = [...input.destCardIds, ...input.sourceCardIds];
    if (reorderedIds.length > 0) {
      const owned = await prisma.card.count({
        where: { id: { in: reorderedIds }, boardId: card.boardId },
      });
      if (owned !== reorderedIds.length) throw new RuleViolation("Card de outro board");
    }

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

  async deleteCard(cardId: string, actorId: string) {
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
}

export function createCardDomain(): CardDomain {
  return new CardDomain();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const card = createCardDomain();
