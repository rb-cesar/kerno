import { prisma } from "@kerno/db";
import { DEFAULT_BOARD_COLUMNS } from "@kerno/contracts/kanban";
import type { BoardData, TaskRefDTO } from "../types";

/** Máximo de boards por workspace. */
export const MAX_BOARDS = 5;

/** Carrega o board completo (colunas, cards, labels, membros) já no formato de DTO. */
export async function getBoardSnapshot(boardId: string): Promise<BoardData | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      workspace: {
        include: {
          users: { include: { user: { select: { id: true, name: true } } } },
          cycles: { orderBy: { startsAt: "asc" } },
          boards: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } },
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

  const memberById = new Map(board.workspace.users.map((m) => [m.user.id, m.user]));
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
    workspaceId: board.workspaceId,
    workspaceKey: board.workspace.key,
    boards: board.workspace.boards.map((b) => ({ id: b.id, name: b.name })),
    members: board.workspace.users.map((m) => ({ id: m.user.id, name: m.user.name })),
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
    cycles: board.workspace.cycles.map((c) => ({
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

/** Resolve o workspace dono de um board/coluna/card — usado pela camada de permissão do app. */
export async function workspaceIdOfBoard(boardId: string): Promise<string | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { workspaceId: true },
  });
  return board?.workspaceId ?? null;
}

export async function workspaceIdOfColumn(columnId: string): Promise<string | null> {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { board: { select: { workspaceId: true } } },
  });
  return column?.board.workspaceId ?? null;
}

export async function workspaceIdOfCard(cardId: string): Promise<string | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { board: { select: { workspaceId: true } } },
  });
  return card?.board.workspaceId ?? null;
}

export async function workspaceIdOfLabel(labelId: string): Promise<string | null> {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    select: { board: { select: { workspaceId: true } } },
  });
  return label?.board.workspaceId ?? null;
}

// ── Boards (CRUD) ─────────────────────────────────────────────────────────────

/** Cria um board já com as colunas/estados padrão. Fonte única do seed. */
export async function createBoardWithDefaults(workspaceId: string, name: string) {
  return prisma.board.create({
    data: {
      workspaceId,
      name: name.trim() || "Novo board",
      columns: { create: [...DEFAULT_BOARD_COLUMNS] },
    },
    select: { id: true },
  });
}

/** Cria um board respeitando o limite de MAX_BOARDS por workspace. */
export async function createBoard(workspaceId: string, name: string) {
  const count = await prisma.board.count({ where: { workspaceId } });
  if (count >= MAX_BOARDS) {
    throw new Error(`Limite de ${MAX_BOARDS} boards por workspace atingido.`);
  }
  return createBoardWithDefaults(workspaceId, name);
}

export async function renameBoard(boardId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome inválido");
  await prisma.board.update({ where: { id: boardId }, data: { name: trimmed } });
}

/** Exclui um board; recusa excluir o último board do workspace. */
export async function deleteBoard(boardId: string) {
  const board = await prisma.board.findUniqueOrThrow({
    where: { id: boardId },
    select: { workspaceId: true },
  });
  const count = await prisma.board.count({ where: { workspaceId: board.workspaceId } });
  if (count <= 1) throw new Error("Não é possível excluir o único board do workspace.");
  await prisma.board.delete({ where: { id: boardId } });
}

// ── Suporte à menção de task no chat (Frente 4) ───────────────────────────────

/** Busca tarefas do workspace por número (KERN-N) ou título — p/ o typeahead `!`. */
export async function searchCards(workspaceId: string, query: string): Promise<TaskRefDTO[]> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { key: true },
  });
  if (!workspace) return [];

  const q = query.trim();
  const asNumber = Number.parseInt(q.replace(/^\D+/, ""), 10);
  const cards = await prisma.card.findMany({
    where: {
      board: { workspaceId },
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        ...(Number.isFinite(asNumber) ? [{ number: asNumber }] : []),
      ],
    },
    select: { id: true, number: true, title: true },
    orderBy: { number: "desc" },
    take: 8,
  });

  return cards.map((c) => ({
    id: c.id,
    number: c.number,
    title: c.title,
    workspaceKey: workspace.key,
  }));
}

/** Snapshot do board que contém um card — usado pelo painel lateral do chat. */
export async function getBoardSnapshotOfCard(cardId: string): Promise<BoardData | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { boardId: true },
  });
  if (!card) return null;
  return getBoardSnapshot(card.boardId);
}
