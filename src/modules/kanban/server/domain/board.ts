import { prisma } from "@/core/db";
import { type BoardData, type CardDTO, type CardsPage, DEFAULT_BOARD_COLUMNS, type TaskRefDTO } from "../../types";

/** Máximo de boards por workspace. */
export const MAX_BOARDS = 5;

/**
 * Máximo de cards trazidos por coluna de uma vez — boards com mais que isso
 * numa coluna carregam o resto sob demanda (ver getColumnCards). Sem isso,
 * getBoardSnapshot trazia todos os cards do board (até MAX_CARDS_PER_BOARD)
 * numa query só, toda vez que alguém abria o board.
 */
export const CARD_PAGE_SIZE = 100;

// Include padrão de card — usado tanto no snapshot quanto na paginação por
// coluna, pra manter os dois caminhos produzindo o mesmo CardDTO.
const CARD_INCLUDE = {
  user: { select: { id: true, name: true } },
  labels: { include: { label: true } },
  story: { select: { title: true } },
} as const;

type CardRow = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  columnId: string;
  order: number;
  priority: CardDTO["priority"];
  dueDate: Date | null;
  estimate: number | null;
  parentId: string | null;
  cycleId: string | null;
  storyId: string | null;
  assignedTo: string | null;
  user: { id: string; name: string } | null;
  story: { title: string } | null;
  labels: { label: { id: string; name: string; color: string } }[];
};

export class BoardDomain {
  private toCardDTO(card: CardRow): CardDTO {
    return {
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
      storyTitle: card.story?.title ?? null,
      assignedTo: card.assignedTo,
      assignee: card.user ? { id: card.user.id, name: card.user.name } : null,
      labels: card.labels.map((cl) => ({ id: cl.label.id, name: cl.label.name, color: cl.label.color })),
    };
  }

  /**
   * Próxima página de cards de uma coluna, na mesma ordem de exibição
   * (order asc, id como desempate). `afterId`: id do último card já
   * carregado — cursor nativo do Prisma (busca a linha, pula ela, segue).
   */
  async getColumnCards(columnId: string, afterId?: string, limit = CARD_PAGE_SIZE): Promise<CardsPage> {
    const rows = await prisma.card.findMany({
      where: { columnId },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      ...(afterId ? { cursor: { id: afterId }, skip: 1 } : {}),
      take: limit,
      include: CARD_INCLUDE,
    });
    return { items: rows.map((row) => this.toCardDTO(row)), hasMore: rows.length === limit };
  }

  /** Carrega o board completo (colunas, cards, labels, membros) já no formato de DTO. */
  async getBoardSnapshot(boardId: string): Promise<BoardData | null> {
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
              orderBy: [{ order: "asc" }, { id: "asc" }],
              take: CARD_PAGE_SIZE,
              include: CARD_INCLUDE,
            },
          },
        },
      },
    });

    if (!board) return null;

    const memberById = new Map(board.workspace.users.map((m) => [m.user.id, m.user]));

    // Contagens reais via agregação — não dá pra somar column.cards (a
    // relação acima só traz a 1ª página) nem pra a taskCount das stories.
    const [columnCounts, storyCounts] = await Promise.all([
      prisma.card.groupBy({ by: ["columnId"], where: { boardId }, _count: { _all: true } }),
      prisma.card.groupBy({ by: ["storyId"], where: { boardId, storyId: { not: null } }, _count: { _all: true } }),
    ]);
    const totalByColumn = new Map(columnCounts.map((c) => [c.columnId, c._count._all]));
    const taskCountByStory = new Map(storyCounts.map((s) => [s.storyId as string, s._count._all]));

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
      columns: board.columns.map((column) => {
        const total = totalByColumn.get(column.id) ?? column.cards.length;
        return {
          id: column.id,
          name: column.name,
          order: column.order,
          category: column.category,
          color: column.color,
          wipLimit: column.wipLimit,
          cards: column.cards.map((card) => this.toCardDTO(card)),
          totalCards: total,
          hasMoreCards: total > column.cards.length,
        };
      }),
    };
  }

  /** Resolve o workspace dono de um board/coluna/card — usado pela camada de permissão do app. */
  async workspaceIdOfBoard(boardId: string): Promise<string | null> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true },
    });
    return board?.workspaceId ?? null;
  }

  async workspaceIdOfColumn(columnId: string): Promise<string | null> {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      select: { board: { select: { workspaceId: true } } },
    });
    return column?.board.workspaceId ?? null;
  }

  async workspaceIdOfCard(cardId: string): Promise<string | null> {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { board: { select: { workspaceId: true } } },
    });
    return card?.board.workspaceId ?? null;
  }

  async workspaceIdOfLabel(labelId: string): Promise<string | null> {
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      select: { board: { select: { workspaceId: true } } },
    });
    return label?.board.workspaceId ?? null;
  }

  // ── Boards (CRUD) ───────────────────────────────────────────────────────

  /** Cria um board já com as colunas/estados padrão. Fonte única do seed. */
  async createBoardWithDefaults(workspaceId: string, name: string) {
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
  async createBoard(workspaceId: string, name: string) {
    const count = await prisma.board.count({ where: { workspaceId } });
    if (count >= MAX_BOARDS) {
      throw new Error(`Limite de ${MAX_BOARDS} boards por workspace atingido.`);
    }
    return this.createBoardWithDefaults(workspaceId, name);
  }

  async renameBoard(boardId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Nome inválido");
    await prisma.board.update({ where: { id: boardId }, data: { name: trimmed } });
  }

  /** Exclui um board; recusa excluir o único board do workspace. */
  async deleteBoard(boardId: string) {
    const board = await prisma.board.findUniqueOrThrow({
      where: { id: boardId },
      select: { workspaceId: true },
    });
    const count = await prisma.board.count({ where: { workspaceId: board.workspaceId } });
    if (count <= 1) throw new Error("Não é possível excluir o único board do workspace.");
    await prisma.board.delete({ where: { id: boardId } });
  }

  // ── Suporte à menção de task no chat (Frente 4) ──────────────────────────

  /** Busca tarefas do workspace por número (KERN-N) ou título — p/ o typeahead `!`. */
  async searchCards(workspaceId: string, query: string): Promise<TaskRefDTO[]> {
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
  async getBoardSnapshotOfCard(cardId: string): Promise<BoardData | null> {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { boardId: true },
    });
    if (!card) return null;
    return this.getBoardSnapshot(card.boardId);
  }
}

export function createBoardDomain(): BoardDomain {
  return new BoardDomain();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const board = createBoardDomain();
