import { prisma } from "@kerno/db";
import type { BoardData } from "../types";

/** Carrega o board completo (colunas, cards, labels, membros) já no formato de DTO. */
export async function getBoardSnapshot(boardId: string): Promise<BoardData | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      project: {
        include: {
          users: { include: { user: { select: { id: true, name: true } } } },
          cycles: { orderBy: { startsAt: "asc" } },
        },
      },
      labels: { orderBy: { name: "asc" } },
      stories: { orderBy: { order: "asc" } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          cards: {
            orderBy: { order: "asc" },
            include: {
              user: { select: { id: true, name: true } },
              labels: { include: { label: true } },
            },
          },
        },
      },
    },
  });

  if (!board) return null;

  const memberById = new Map(board.project.users.map((m) => [m.user.id, m.user]));
  const storyTitleById = new Map(board.stories.map((s) => [s.id, s.title]));
  const taskCountByStory = new Map<string, number>();
  for (const column of board.columns) {
    for (const card of column.cards) {
      if (card.storyId) {
        taskCountByStory.set(card.storyId, (taskCountByStory.get(card.storyId) ?? 0) + 1);
      }
    }
  }

  return {
    id: board.id,
    name: board.name,
    projectId: board.projectId,
    projectKey: board.project.key,
    members: board.project.users.map((m) => ({ id: m.user.id, name: m.user.name })),
    labels: board.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    stories: board.stories.map((s) => {
      const assignee = s.assignedTo ? memberById.get(s.assignedTo) : null;
      return {
        id: s.id,
        number: s.number,
        title: s.title,
        description: s.description,
        status: s.status,
        assignedTo: s.assignedTo,
        assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
        dueDate: s.dueDate ? s.dueDate.toISOString() : null,
        priority: s.priority,
        color: s.color,
        taskCount: taskCountByStory.get(s.id) ?? 0,
      };
    }),
    cycles: board.project.cycles.map((c) => ({
      id: c.id,
      name: c.name,
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
    })),
    columns: board.columns.map((column) => ({
      id: column.id,
      name: column.name,
      order: column.order,
      category: column.category,
      color: column.color,
      wipLimit: column.wipLimit,
      cards: column.cards.map((card) => ({
        id: card.id,
        number: card.number,
        title: card.title,
        description: card.description,
        columnId: card.columnId,
        order: card.order,
        priority: card.priority,
        dueDate: card.dueDate ? card.dueDate.toISOString() : null,
        estimate: card.estimate,
        parentId: card.parentId,
        cycleId: card.cycleId,
        storyId: card.storyId,
        storyTitle: card.storyId ? (storyTitleById.get(card.storyId) ?? null) : null,
        assignedTo: card.assignedTo,
        assignee: card.user ? { id: card.user.id, name: card.user.name } : null,
        labels: card.labels.map((cl) => ({
          id: cl.label.id,
          name: cl.label.name,
          color: cl.label.color,
        })),
      })),
    })),
  };
}

/** Resolve o projeto dono de um board/coluna/card — usado pela camada de permissão do app. */
export async function projectIdOfBoard(boardId: string): Promise<string | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { projectId: true },
  });
  return board?.projectId ?? null;
}

export async function projectIdOfColumn(columnId: string): Promise<string | null> {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { board: { select: { projectId: true } } },
  });
  return column?.board.projectId ?? null;
}

export async function projectIdOfCard(cardId: string): Promise<string | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { board: { select: { projectId: true } } },
  });
  return card?.board.projectId ?? null;
}

export async function projectIdOfLabel(labelId: string): Promise<string | null> {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    select: { board: { select: { projectId: true } } },
  });
  return label?.board.projectId ?? null;
}
