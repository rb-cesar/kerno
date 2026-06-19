import { prisma } from "@kerno/db";
import { eventBus, createEvent } from "@kerno/core/events";
import type { Priority, StatusCategory } from "../types";

/** Publica o resync genérico do Kanban p/ os outros clientes do projeto. */
function notifyChanged(boardId: string, projectId: string, actorId: string) {
  eventBus.publish(
    createEvent("kanban:changed", projectId, { boardId, cardId: null }, actorId),
  );
}

/** Cria uma User Story no board, numerada por board (em transação) e ao final da ordem. */
export async function createStory(boardId: string, title: string, actorId: string) {
  const board = await prisma.board.findUniqueOrThrow({
    where: { id: boardId },
    select: { projectId: true },
  });
  const story = await prisma.$transaction(async (tx) => {
    const agg = await tx.story.aggregate({
      where: { boardId },
      _max: { number: true, order: true },
    });
    const number = (agg._max.number ?? 0) + 1;
    const order = (agg._max.order ?? -1) + 1;
    return tx.story.create({ data: { boardId, title, number, order } });
  });
  notifyChanged(boardId, board.projectId, actorId);
  return story;
}

export async function updateStory(
  input: {
    storyId: string;
    title: string;
    description: string | null;
    status: StatusCategory;
    assignedTo: string | null;
    dueDate: Date | null;
    priority: Priority;
    color: string | null;
  },
  actorId: string,
) {
  const story = await prisma.story.update({
    where: { id: input.storyId },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      assignedTo: input.assignedTo,
      dueDate: input.dueDate,
      priority: input.priority,
      color: input.color,
    },
    select: { id: true, boardId: true, board: { select: { projectId: true } } },
  });
  notifyChanged(story.boardId, story.board.projectId, actorId);
}

export async function deleteStory(storyId: string, actorId: string): Promise<void> {
  const story = await prisma.story.delete({
    where: { id: storyId },
    select: { boardId: true, board: { select: { projectId: true } } },
  });
  notifyChanged(story.boardId, story.board.projectId, actorId);
}

/** Projeto dono de uma story — usado pela camada de permissão. */
export async function projectIdOfStory(storyId: string): Promise<string | null> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { board: { select: { projectId: true } } },
  });
  return story?.board.projectId ?? null;
}
