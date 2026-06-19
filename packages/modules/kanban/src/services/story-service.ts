import { prisma } from "@kerno/db";
import type { Priority, StatusCategory } from "../types";

/** Cria uma User Story no board, numerada por board (em transação) e ao final da ordem. */
export async function createStory(boardId: string, title: string) {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.story.aggregate({
      where: { boardId },
      _max: { number: true, order: true },
    });
    const number = (agg._max.number ?? 0) + 1;
    const order = (agg._max.order ?? -1) + 1;
    return tx.story.create({ data: { boardId, title, number, order } });
  });
}

export async function updateStory(input: {
  storyId: string;
  title: string;
  description: string | null;
  status: StatusCategory;
  assignedTo: string | null;
  dueDate: Date | null;
  priority: Priority;
  color: string | null;
}) {
  return prisma.story.update({
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
  });
}

export async function deleteStory(storyId: string): Promise<void> {
  await prisma.story.delete({ where: { id: storyId } });
}

/** Projeto dono de uma story — usado pela camada de permissão. */
export async function projectIdOfStory(storyId: string): Promise<string | null> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { board: { select: { projectId: true } } },
  });
  return story?.board.projectId ?? null;
}
