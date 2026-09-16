import { prisma } from "@kerno/db";
import { createCard } from "./card-service";
import type { CardDetailDTO, MemberDTO } from "../types";

/** Cria uma sub-tarefa: um card filho no mesmo estado (coluna) do pai. */
export async function createSubtask(parentId: string, title: string, actorId: string) {
  const parent = await prisma.card.findUniqueOrThrow({
    where: { id: parentId },
    select: { columnId: true },
  });
  return createCard(parent.columnId, title, actorId, parentId);
}

export async function addComment(cardId: string, body: string, actorId: string) {
  return prisma.cardComment.create({ data: { cardId, body, userId: actorId } });
}

/** Remove um comentário — apenas o próprio autor pode. */
export async function deleteComment(commentId: string, actorId: string): Promise<void> {
  const comment = await prisma.cardComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  if (!comment) return;
  if (comment.userId !== actorId) throw new Error("Você só pode excluir seus próprios comentários");
  await prisma.cardComment.delete({ where: { id: commentId } });
}

/** Projeto dono de um comentário — usado pela camada de permissão. */
export async function cardIdOfComment(commentId: string): Promise<string | null> {
  const comment = await prisma.cardComment.findUnique({
    where: { id: commentId },
    select: { cardId: true },
  });
  return comment?.cardId ?? null;
}

/**
 * Detalhe do card carregado sob demanda (ao abrir o card): sub-tarefas, comentários
 * e a linha do tempo de atividade (derivada do histórico de estado). Resolve nomes
 * de coluna e de autor por consulta (userId/columnId são escalares no histórico).
 */
export async function getCardDetail(cardId: string, viewerId: string): Promise<CardDetailDTO> {
  const card = await prisma.card.findUniqueOrThrow({
    where: { id: cardId },
    select: { boardId: true },
  });

  const [children, checklists, comments, events, columns] = await Promise.all([
    prisma.card.findMany({
      where: { parentId: cardId },
      orderBy: { number: "asc" },
      include: { column: { select: { name: true, category: true } } },
    }),
    prisma.checklist.findMany({
      where: { cardId },
      orderBy: { order: "asc" },
      include: { items: { orderBy: { order: "asc" } } },
    }),
    prisma.cardComment.findMany({ where: { cardId }, orderBy: { createdAt: "asc" } }),
    prisma.cardStatusEvent.findMany({ where: { cardId }, orderBy: { at: "asc" } }),
    prisma.column.findMany({ where: { boardId: card.boardId }, select: { id: true, name: true } }),
  ]);

  const columnName = new Map(columns.map((c) => [c.id, c.name]));

  // Nomes dos usuários referenciados (autores de comentário + atores do histórico).
  const userIds = new Set<string>();
  for (const c of comments) if (c.userId) userIds.add(c.userId);
  for (const e of events) if (e.actorId) userIds.add(e.actorId);
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, name: true },
  });
  const userById = new Map<string, MemberDTO>(users.map((u) => [u.id, { id: u.id, name: u.name }]));

  return {
    cardId,
    children: children.map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      category: c.column.category,
      done: c.column.category === "COMPLETED",
    })),
    checklists: checklists.map((cl) => ({
      id: cl.id,
      title: cl.title,
      items: cl.items.map((it) => ({ id: it.id, text: it.text, done: it.done })),
    })),
    comments: comments.map((c) => ({
      id: c.id,
      author: c.userId ? (userById.get(c.userId) ?? null) : null,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      mine: c.userId === viewerId,
    })),
    activity: events.map((e) => ({
      id: e.id,
      at: e.at.toISOString(),
      actorName: e.actorId ? (userById.get(e.actorId)?.name ?? null) : null,
      toColumnName: columnName.get(e.toColumnId) ?? "—",
      category: e.category,
      initial: e.fromColumnId === null,
    })),
  };
}
