import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/core/db";
import { NotFound, RuleViolation } from "@/core/errors";
import { kanbanCommandSchema } from "@/modules/kanban/dto";
import * as domain from "@/modules/kanban/server/domain";
import { kanbanGuards } from "@/modules/kanban/server/guards";
import type { BoardData, CardDTO, KanbanCommand, KanbanMutationResult } from "@/modules/kanban/types";
import type { ActionResult } from "@/modules/workspaces/types";
import { container } from "@/server/container";
import { registerChatTools } from "./chat-tools";
import { DESTRUCTIVE, READ, run, WRITE, workspaceSlug } from "./common";

const { workspaces, kanban } = container;

/** `runCommand` devolve `{ ok: false, error }` em vez de lançar — converte para o mesmo contrato. */
function unwrap(result: KanbanMutationResult, done: string): string {
  if (!result.ok) throw new Error(result.error);
  return done;
}

// ── Formatação compacta (o snapshot cru do board é grande demais p/ o contexto) ──

function compactCard(card: CardDTO, key: string) {
  return {
    id: card.id,
    ref: `${key}-${card.number}`,
    title: card.title,
    priority: card.priority === "NONE" ? undefined : card.priority,
    assignee: card.assignee?.name,
    labels: card.labels.length > 0 ? card.labels.map((l) => l.name) : undefined,
    dueDate: card.dueDate?.slice(0, 10),
    estimate: card.estimate ?? undefined,
    parentId: card.parentId ?? undefined,
    story: card.storyTitle ?? undefined,
    cycleId: card.cycleId ?? undefined,
  };
}

function compactBoard(board: BoardData) {
  const key = board.workspaceKey;
  return {
    id: board.id,
    name: board.name,
    workspaceId: board.workspaceId,
    workspaceKey: key,
    boards: board.boards,
    columns: board.columns.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      wipLimit: c.wipLimit ?? undefined,
      totalCards: c.totalCards,
      // Quando true, os cards abaixo são só a 1ª página — use list_column_cards.
      hasMoreCards: c.hasMoreCards || undefined,
      cards: c.cards.map((card) => compactCard(card, key)),
    })),
    labels: board.labels,
    cycles: board.cycles,
    stories: board.stories.map((s) => ({
      id: s.id,
      ref: `${key}-S${s.number}`,
      title: s.title,
      status: s.status,
      priority: s.priority === "NONE" ? undefined : s.priority,
      assignee: s.assignee?.name,
      taskCount: s.taskCount,
    })),
    members: board.members,
  };
}

// ── Parâmetros compartilhados ────────────────────────────────────────────────

const priority = z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]);
const cardParam = z
  .string()
  .min(1)
  .describe('ID do card, ou a referência "KEY-N" (ex.: KERN-12). Com KEY-N é obrigatório informar `workspace`.');
const workspaceForRef = z
  .string()
  .optional()
  .describe("Slug do workspace — só necessário se `card` for uma referência KEY-N");

/** `YYYY-MM-DD` de um dia que existe: `2026-02-31` não passa (o JS o normalizaria para março). */
function isRealCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

const dueDate = z
  .string()
  .refine(isRealCalendarDate, "Use uma data real no formato YYYY-MM-DD (ex.: 2026-10-31)")
  .nullable()
  .describe("Data no formato YYYY-MM-DD (ex.: 2026-10-31) ou null para remover");

const unique = <T>(items: T[]): T[] => [...new Set(items)];

/** `ActionResult` (convites/papéis) devolve `{ ok: false, error }` em vez de lançar — converte para exceção. */
function unwrapAction(result: ActionResult, done: string): string {
  if (!result.ok) throw new Error(result.error);
  return result.message ?? done;
}

export function registerKernoTools(server: McpServer, userId: string): void {
  // ── Helpers que dependem do usuário ───────────────────────────────────────

  /** Aceita id de card ou "KEY-N"; a referência é resolvida dentro de um workspace de que o usuário é membro. */
  async function resolveCardId(card: string, workspace?: string): Promise<string> {
    const ref = /^([A-Za-z]+)-(\d+)$/.exec(card.trim());
    if (!ref) return card.trim();
    if (!workspace) throw new RuleViolation(`Para usar a referência ${card}, informe também o slug em \`workspace\`.`);

    const ws = await workspaces.getBySlug(userId, workspace); // também checa membership
    // O número sozinho identifica o card no workspace, mas o prefixo tem que bater: um typo
    // (WRONG-12) não pode cair em silêncio em outro card.
    const { key } = await prisma.workspace.findUniqueOrThrow({ where: { id: ws.id }, select: { key: true } });
    if ((ref[1] ?? "").toUpperCase() !== key.toUpperCase()) {
      throw new RuleViolation(`A referência ${card} não é do workspace "${workspace}" (a chave dele é ${key}).`);
    }
    const found = await prisma.card.findFirst({
      where: { number: Number(ref[2]), board: { workspaceId: ws.id } },
      select: { id: true },
    });
    if (!found) throw new NotFound(`Card ${card} não encontrado no workspace ${workspace}`);
    return found.id;
  }

  /** Coluna do board por id ou por nome (sem distinguir maiúsculas). */
  async function resolveColumn(boardId: string, ref: string): Promise<{ id: string; name: string }> {
    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    });
    const wanted = ref.trim().toLowerCase();
    const found = columns.find((c) => c.id === ref.trim()) ?? columns.find((c) => c.name.toLowerCase() === wanted);
    if (!found)
      throw new NotFound(`Coluna "${ref}" não existe neste board. Colunas: ${columns.map((c) => c.name).join(", ")}`);
    return found;
  }

  const orderedCardIds = async (columnId: string): Promise<string[]> =>
    (
      await prisma.card.findMany({
        where: { columnId },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { id: true },
      })
    ).map((c) => c.id);

  type CardPatch = {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    labelIds?: string[];
    priority?: z.infer<typeof priority>;
    dueDate?: string | null;
    estimate?: number | null;
    cycleId?: string | null;
    storyId?: string | null;
  };

  /**
   * Valida o patch ANTES de qualquer escrita — create_card não pode deixar um card pela metade
   * (criado e publicado) quando o responsável/etiqueta/data do patch é inválido.
   */
  async function assertPatchValid(ctx: { boardId: string; workspaceId: string }, patch: CardPatch): Promise<void> {
    if (patch.assigneeId) {
      const member = await prisma.workspaceUser.findUnique({
        where: { userId_workspaceId: { userId: patch.assigneeId, workspaceId: ctx.workspaceId } },
      });
      if (!member)
        throw new RuleViolation("O responsável precisa ser membro do workspace (ids em get_board → members)");
    }
    if (patch.dueDate && !isRealCalendarDate(patch.dueDate)) {
      throw new RuleViolation("Data inválida: use uma data real no formato YYYY-MM-DD");
    }
    if (patch.labelIds && patch.labelIds.length > 0) {
      const owned = await prisma.label.count({ where: { id: { in: patch.labelIds }, boardId: ctx.boardId } });
      if (owned !== unique(patch.labelIds).length) throw new RuleViolation("Etiqueta de outro board");
    }
  }

  /** `updateCard` do app exige o card inteiro; aqui `undefined` = manter, `null` = limpar. */
  async function patchCard(cardId: string, patch: CardPatch): Promise<void> {
    await kanbanGuards.guardCard(userId, cardId, "MEMBER");
    const current = await prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { labels: { select: { labelId: true } }, board: { select: { workspaceId: true } } },
    });

    const title = patch.title === undefined ? current.title : patch.title.trim();
    if (!title) throw new RuleViolation("Título vazio");

    await assertPatchValid({ boardId: current.boardId, workspaceId: current.board.workspaceId }, patch);

    const command: KanbanCommand = {
      type: "updateCard",
      cardId,
      title,
      description: patch.description === undefined ? current.description : patch.description,
      assignedTo: patch.assigneeId === undefined ? current.assignedTo : patch.assigneeId,
      labelIds: patch.labelIds ? unique(patch.labelIds) : current.labels.map((l) => l.labelId),
      priority: patch.priority ?? current.priority,
      dueDate: patch.dueDate === undefined ? (current.dueDate?.toISOString() ?? null) : patch.dueDate,
      estimate: patch.estimate === undefined ? current.estimate : patch.estimate,
      cycleId: patch.cycleId === undefined ? current.cycleId : patch.cycleId,
      storyId: patch.storyId === undefined ? current.storyId : patch.storyId,
    };
    unwrap(await kanban.runCommand(userId, command), "");
  }

  const cardRef = async (cardId: string): Promise<string> => {
    const c = await prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      select: { number: true, board: { select: { workspace: { select: { key: true } } } } },
    });
    return `${c.board.workspace.key}-${c.number}`;
  };

  // ── Leitura ───────────────────────────────────────────────────────────────

  server.registerTool(
    "list_workspaces",
    {
      title: "Listar workspaces",
      description: "Lista os workspaces do Kerno de que o usuário é membro (id, nome, slug, nº de membros).",
      annotations: READ,
    },
    () => run(() => workspaces.listForUser(userId)),
  );

  server.registerTool(
    "get_workspace",
    {
      title: "Detalhar workspace",
      description: "Detalhes de um workspace: descrição, membros (id, nome, papel) e o papel do usuário nele.",
      inputSchema: { workspace: workspaceSlug },
      annotations: READ,
    },
    ({ workspace }) => run(() => workspaces.getBySlug(userId, workspace)),
  );

  server.registerTool(
    "get_board",
    {
      title: "Ver board",
      description:
        "Board kanban com colunas, cards (id, ref KEY-N, título, prioridade, responsável, labels…), labels, cycles, stories e membros. " +
        "Informe `workspace` para o board principal, ou `board_id` para um board específico (ids em `boards`). " +
        "Cada coluna traz só a 1ª página de cards; se `hasMoreCards` for true use list_column_cards.",
      inputSchema: {
        workspace: workspaceSlug.optional(),
        board_id: z.string().min(1).optional().describe("ID do board (alternativa a `workspace`)"),
      },
      annotations: READ,
    },
    ({ workspace, board_id }) =>
      run(async () => {
        if (!workspace === !board_id) throw new RuleViolation("Informe exatamente um: `workspace` ou `board_id`.");
        if (board_id) return compactBoard(await kanban.snapshot(userId, board_id));
        const ws = await workspaces.getBySlug(userId, workspace as string);
        return compactBoard(await kanban.boardForWorkspace(userId, ws.id));
      }),
  );

  server.registerTool(
    "list_column_cards",
    {
      title: "Listar cards de uma coluna",
      description: "Próxima página de cards de uma coluna (100 por vez). Use `after_id` = id do último card já visto.",
      inputSchema: {
        column_id: z.string().min(1),
        after_id: z.string().optional().describe("Cursor: id do último card da página anterior"),
      },
      annotations: READ,
    },
    ({ column_id, after_id }) =>
      run(async () => {
        const page = await kanban.columnCards(userId, column_id, after_id);
        const column = await prisma.column.findUniqueOrThrow({
          where: { id: column_id },
          select: { board: { select: { workspace: { select: { key: true } } } } },
        });
        const key = column.board.workspace.key;
        return { hasMore: page.hasMore, cards: page.items.map((c) => compactCard(c, key)) };
      }),
  );

  server.registerTool(
    "search_cards",
    {
      title: "Buscar cards",
      description: "Busca cards do workspace por referência (KERN-12) ou trecho do título.",
      inputSchema: { workspace: workspaceSlug, query: z.string().describe("Texto ou referência KEY-N") },
      annotations: READ,
    },
    ({ workspace, query }) =>
      run(async () => {
        const ws = await workspaces.getBySlug(userId, workspace);
        const found = await kanban.searchCards(userId, ws.id, query);
        return found.map((t) => ({ id: t.id, ref: `${t.workspaceKey}-${t.number}`, title: t.title }));
      }),
  );

  server.registerTool(
    "get_card",
    {
      title: "Ver card",
      description:
        "Detalhe completo de um card: descrição, coluna, responsável, labels, sub-tarefas, checklists, comentários e histórico de estados.",
      inputSchema: { card: cardParam, workspace: workspaceForRef },
      annotations: READ,
    },
    ({ card, workspace }) =>
      run(async () => {
        const cardId = await resolveCardId(card, workspace);
        const detail = await kanban.cardDetail(userId, cardId); // também é o guard de leitura
        const row = await prisma.card.findUniqueOrThrow({
          where: { id: cardId },
          include: {
            column: { select: { id: true, name: true, category: true } },
            user: { select: { id: true, name: true } },
            labels: { include: { label: true } },
            story: { select: { id: true, title: true } },
            cycle: { select: { id: true, name: true } },
            board: { select: { id: true, name: true, workspace: { select: { key: true, slug: true } } } },
          },
        });
        return {
          id: row.id,
          ref: `${row.board.workspace.key}-${row.number}`,
          title: row.title,
          description: row.description,
          workspace: row.board.workspace.slug,
          board: { id: row.board.id, name: row.board.name },
          column: row.column,
          priority: row.priority,
          assignee: row.user,
          dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
          estimate: row.estimate,
          labels: row.labels.map((l) => ({ id: l.label.id, name: l.label.name })),
          story: row.story,
          cycle: row.cycle,
          parentId: row.parentId,
          subtasks: detail.children,
          checklists: detail.checklists,
          comments: detail.comments.map((c) => ({ id: c.id, author: c.author?.name, at: c.createdAt, body: c.body })),
          activity: detail.activity,
        };
      }),
  );

  server.registerTool(
    "get_board_metrics",
    {
      title: "Métricas do board",
      description: "Métricas de fluxo: concluídos, WIP, cycle time e lead time médios, throughput semanal (8 semanas).",
      inputSchema: { board_id: z.string().min(1) },
      annotations: READ,
    },
    ({ board_id }) => run(() => kanban.metrics(userId, board_id)),
  );

  // ── Escrita: workspaces ───────────────────────────────────────────────────

  server.registerTool(
    "create_workspace",
    {
      title: "Criar workspace",
      description: "Cria um workspace (com board padrão e canal #geral) e torna o usuário ADMIN. Devolve o slug.",
      inputSchema: {
        name: z.string().min(2).max(60),
        description: z.string().max(500).optional(),
      },
      annotations: WRITE,
    },
    ({ name, description }) => run(() => workspaces.createWorkspace(userId, { name, description })),
  );

  server.registerTool(
    "invite_member",
    {
      title: "Convidar membro",
      description:
        "Adiciona ao workspace um usuário que já tem conta no Kerno (por e-mail). Exige ser ADMIN do workspace.",
      inputSchema: {
        workspace: workspaceSlug,
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
      },
      annotations: WRITE,
    },
    ({ workspace, email, role }) =>
      run(async () => {
        const ws = await workspaces.getBySlug(userId, workspace);
        return unwrapAction(await workspaces.invite(userId, ws.id, { email, role }), "Membro adicionado.");
      }),
  );

  server.registerTool(
    "set_member_role",
    {
      title: "Alterar papel de membro",
      description: "Troca o papel (ADMIN/MEMBER/VIEWER) de um membro. Exige ser ADMIN do workspace.",
      inputSchema: {
        workspace: workspaceSlug,
        user_id: z.string().min(1).describe("ID do membro (get_workspace → members)"),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
      },
      annotations: WRITE,
    },
    ({ workspace, user_id, role }) =>
      run(async () => {
        const ws = await workspaces.getBySlug(userId, workspace);
        return unwrapAction(
          await workspaces.updateMember(userId, ws.id, { userId: user_id, role }),
          "Papel atualizado.",
        );
      }),
  );

  server.registerTool(
    "remove_member",
    {
      title: "Remover membro",
      description: "Remove um membro do workspace. Exige ser ADMIN; o último admin não pode ser removido.",
      inputSchema: { workspace: workspaceSlug, user_id: z.string().min(1) },
      annotations: DESTRUCTIVE,
    },
    ({ workspace, user_id }) =>
      run(async () => {
        const ws = await workspaces.getBySlug(userId, workspace);
        return unwrapAction(await workspaces.removeMember(userId, ws.id, user_id), "Membro removido.");
      }),
  );

  // ── Escrita: cards ────────────────────────────────────────────────────────

  server.registerTool(
    "create_card",
    {
      title: "Criar card",
      description:
        "Cria um card no fim da coluna. Campos opcionais (descrição, prioridade, responsável…) são aplicados logo em seguida. " +
        "Devolve id e referência KEY-N.",
      inputSchema: {
        column_id: z.string().min(1).describe("ID da coluna (get_board → columns)"),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: priority.optional(),
        assignee_id: z.string().optional().describe("ID de um membro do workspace"),
        due_date: dueDate.optional(),
        estimate: z.number().int().optional().describe("Story points"),
        label_ids: z.array(z.string()).optional(),
      },
      annotations: WRITE,
    },
    ({ column_id, title, description, priority: prio, assignee_id, due_date, estimate, label_ids }) =>
      run(async () => {
        // Chama o domínio (não runCommand) porque runCommand descarta o card criado e o
        // modelo precisa do id; guard e validação de título espelham o service.
        await kanbanGuards.guardColumn(userId, column_id, "MEMBER");
        const trimmed = title.trim();
        if (!trimmed) throw new RuleViolation("Título vazio");

        const patch: CardPatch = {
          description,
          priority: prio,
          assigneeId: assignee_id,
          dueDate: due_date,
          estimate,
          labelIds: label_ids ? unique(label_ids) : undefined,
        };
        const hasPatch = Object.values(patch).some((v) => v !== undefined);

        // Tudo que pode falhar é validado antes de criar: o card é publicado (evento, anúncio
        // no chat) assim que nasce e não pode ficar pela metade.
        if (hasPatch) {
          const column = await prisma.column.findUniqueOrThrow({
            where: { id: column_id },
            select: { boardId: true, board: { select: { workspaceId: true } } },
          });
          await assertPatchValid({ boardId: column.boardId, workspaceId: column.board.workspaceId }, patch);
        }

        const created = await domain.card.createCard(column_id, trimmed, userId);
        if (hasPatch) {
          try {
            await patchCard(created.id, patch);
          } catch (err) {
            // Falha inesperada depois de validar (ex.: banco): desfaz em vez de deixar o card sem os campos.
            await domain.card.deleteCard(created.id, userId).catch(() => undefined);
            throw err;
          }
        }

        return { id: created.id, ref: await cardRef(created.id), title: trimmed };
      }),
  );

  server.registerTool(
    "update_card",
    {
      title: "Editar card",
      description:
        "Edita campos de um card. Só os campos informados mudam; `null` limpa (descrição, responsável, data, estimativa, cycle, story). " +
        "`label_ids` substitui o conjunto inteiro de labels.",
      inputSchema: {
        card: cardParam,
        workspace: workspaceForRef,
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        priority: priority.optional(),
        assignee_id: z.string().nullable().optional(),
        due_date: dueDate.optional(),
        estimate: z.number().int().nullable().optional(),
        label_ids: z.array(z.string()).optional(),
        cycle_id: z.string().nullable().optional(),
        story_id: z.string().nullable().optional(),
      },
      annotations: WRITE,
    },
    (a) =>
      run(async () => {
        const cardId = await resolveCardId(a.card, a.workspace);
        await patchCard(cardId, {
          title: a.title,
          description: a.description,
          priority: a.priority,
          assigneeId: a.assignee_id,
          dueDate: a.due_date,
          estimate: a.estimate,
          labelIds: a.label_ids,
          cycleId: a.cycle_id,
          storyId: a.story_id,
        });
        return `Card ${await cardRef(cardId)} atualizado.`;
      }),
  );

  server.registerTool(
    "move_card",
    {
      title: "Mover card",
      description:
        "Move um card para outra coluna do mesmo board (por nome ou id) ou reordena dentro da própria coluna. " +
        "Sem `position` vai para o fim; `position` é o índice 0-based na coluna de destino.",
      inputSchema: {
        card: cardParam,
        workspace: workspaceForRef,
        to_column: z.string().min(1).describe('Nome (ex.: "Em progresso") ou id da coluna de destino'),
        position: z.number().int().min(0).optional(),
      },
      annotations: WRITE,
    },
    ({ card, workspace, to_column, position }) =>
      run(async () => {
        const cardId = await resolveCardId(card, workspace);
        await kanbanGuards.guardCard(userId, cardId, "MEMBER");
        const current = await prisma.card.findUniqueOrThrow({
          where: { id: cardId },
          select: { columnId: true, boardId: true },
        });
        const target = await resolveColumn(current.boardId, to_column);

        // moveCard do domínio reescreve `order` de tudo que recebe: monta as duas listas completas.
        const sameColumn = target.id === current.columnId;
        const sourceRest = (await orderedCardIds(current.columnId)).filter((id) => id !== cardId);
        const destRest = sameColumn ? sourceRest : await orderedCardIds(target.id);
        const at = Math.min(position ?? destRest.length, destRest.length);

        const result = await kanban.runCommand(userId, {
          type: "moveCard",
          cardId,
          fromColumnId: current.columnId,
          toColumnId: target.id,
          destCardIds: [...destRest.slice(0, at), cardId, ...destRest.slice(at)],
          sourceCardIds: sameColumn ? [] : sourceRest,
        });
        return unwrap(result, `Card ${await cardRef(cardId)} movido para "${target.name}".`);
      }),
  );

  server.registerTool(
    "delete_card",
    {
      title: "Excluir card",
      description: "Exclui um card (e o que depende dele) de forma permanente.",
      inputSchema: { card: cardParam, workspace: workspaceForRef },
      annotations: DESTRUCTIVE,
    },
    ({ card, workspace }) =>
      run(async () => {
        const cardId = await resolveCardId(card, workspace);
        const ref = await cardRef(cardId);
        return unwrap(await kanban.runCommand(userId, { type: "deleteCard", cardId }), `Card ${ref} excluído.`);
      }),
  );

  server.registerTool(
    "add_comment",
    {
      title: "Comentar em card",
      description: "Adiciona um comentário (até 4000 caracteres) ao card, em nome do usuário.",
      inputSchema: { card: cardParam, workspace: workspaceForRef, body: z.string().min(1).max(4000) },
      annotations: WRITE,
    },
    ({ card, workspace, body }) =>
      run(async () => {
        const cardId = await resolveCardId(card, workspace);
        return unwrap(await kanban.runCommand(userId, { type: "addComment", cardId, body }), "Comentário adicionado.");
      }),
  );

  server.registerTool(
    "create_subtask",
    {
      title: "Criar sub-tarefa",
      description: "Cria uma sub-tarefa (card filho) na mesma coluna do card pai. Devolve id e referência.",
      inputSchema: { parent: cardParam, workspace: workspaceForRef, title: z.string().min(1) },
      annotations: WRITE,
    },
    ({ parent, workspace, title }) =>
      run(async () => {
        const parentId = await resolveCardId(parent, workspace);
        await kanbanGuards.guardCard(userId, parentId, "MEMBER");
        const trimmed = title.trim();
        if (!trimmed) throw new RuleViolation("Título vazio");
        const created = await domain.cardDetail.createSubtask(parentId, trimmed, userId);
        return { id: created.id, ref: await cardRef(created.id), title: trimmed };
      }),
  );

  // ── Escape hatch: todo o resto do kanban ──────────────────────────────────

  server.registerTool(
    "kanban_command",
    {
      title: "Comando kanban (avançado)",
      description:
        "Executa qualquer comando de escrita do kanban não coberto pelas tools acima — boards, colunas, labels, cycles, stories, " +
        "checklists e itens, exclusão de comentário. `command` segue o schema de KanbanCommand (campo `type` + parâmetros). " +
        "Vários tipos são destrutivos (deleteBoard, deleteColumn, deleteStory…): confirme com o usuário antes.",
      inputSchema: { command: kanbanCommandSchema },
      annotations: DESTRUCTIVE,
    },
    ({ command }) =>
      run(async () => unwrap(await kanban.runCommand(userId, command), `Comando ${command.type} executado.`)),
  );

  registerChatTools(server, userId);
}
