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
        },
      },
      labels: { orderBy: { name: "asc" } },
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

  return {
    id: board.id,
    name: board.name,
    projectId: board.projectId,
    members: board.project.users.map((m) => ({ id: m.user.id, name: m.user.name })),
    labels: board.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    columns: board.columns.map((column) => ({
      id: column.id,
      name: column.name,
      order: column.order,
      cards: column.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        columnId: card.columnId,
        order: card.order,
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
