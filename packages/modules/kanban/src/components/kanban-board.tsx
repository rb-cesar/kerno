"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { BarChart3, BookMarked, LayoutGrid, List, Map as MapIcon, Search } from "lucide-react";
import type { Socket } from "socket.io-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TabDock,
  TooltipProvider,
  cn,
  useDockTabs,
  type DockTab,
} from "@kerno/ui";
import type {
  BoardData,
  ColumnDTO,
  KanbanFetch,
  KanbanFetchCardDetail,
  KanbanFetchMetrics,
  KanbanMutate,
  Priority,
} from "../types";
import { useKanbanRealtime } from "../hooks/use-kanban-realtime";
import { KanbanProvider } from "./kanban-context";
import { KanbanColumn } from "./kanban-column";
import { KanbanList } from "./kanban-list";
import { KanbanMetrics } from "./kanban-metrics";
import { CardPanelContent } from "./card-dialog";
import { CATEGORY_COLOR } from "./meta";
import { BoardSwitcher } from "./board-switcher";
import { AddColumn } from "./add-column";
import { KanbanSidebar } from "./kanban-sidebar";
import { CommandPalette } from "./command-palette";
import { StoriesView } from "./stories-view";
import { BoardMinimap } from "./column-minimap";

function toggleInSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

type GroupBy = "none" | "assignee" | "priority";
type Lane = { key: string; label: string; columns: ColumnDTO[] };

const PRIORITY_LANES: { p: Priority; label: string }[] = [
  { p: "URGENT", label: "Urgente" },
  { p: "HIGH", label: "Alta" },
  { p: "MEDIUM", label: "Média" },
  { p: "LOW", label: "Baixa" },
  { p: "NONE", label: "Sem prioridade" },
];

/** Recorta as colunas por faixa, mantendo só as faixas com algum card. */
function buildLanes(
  groupBy: GroupBy,
  columns: ColumnDTO[],
  members: { id: string; name: string }[],
): Lane[] {
  const lane = (key: string, label: string, keep: (c: ColumnDTO["cards"][number]) => boolean): Lane | null => {
    const laneColumns = columns.map((col) => ({ ...col, cards: col.cards.filter(keep) }));
    const total = laneColumns.reduce((n, col) => n + col.cards.length, 0);
    return total > 0 ? { key, label, columns: laneColumns } : null;
  };

  if (groupBy === "assignee") {
    const lanes = members
      .map((m) => lane(`a:${m.id}`, m.name, (c) => c.assignedTo === m.id))
      .filter((l): l is Lane => l !== null);
    const unassigned = lane("a:none", "Sem responsável", (c) => c.assignedTo == null);
    return unassigned ? [...lanes, unassigned] : lanes;
  }
  // priority
  return PRIORITY_LANES.map(({ p, label }) =>
    lane(`p:${p}`, label, (c) => c.priority === p),
  ).filter((l): l is Lane => l !== null);
}

/**
 * Move um card entre colunas operando na lista COMPLETA, mas posicionando-o
 * conforme o índice VISÍVEL (do DnD, que enxerga só os cards filtrados). Isso
 * permite arrastar mesmo com filtros ativos: a remoção é por id e a inserção é
 * "antes do card visível que está na posição de destino" (ou no fim).
 */
function moveCardByVisibleIndex(
  columns: ColumnDTO[],
  args: { cardId: string; fromColId: string; toColId: string; destVisibleIndex: number },
  isVisible: (card: ColumnDTO["cards"][number]) => boolean,
): { columns: ColumnDTO[]; destCardIds: string[]; sourceCardIds: string[] } | null {
  const cols = structuredClone(columns) as ColumnDTO[];
  const from = cols.find((c) => c.id === args.fromColId);
  const to = cols.find((c) => c.id === args.toColId);
  if (!from || !to) return null;

  const idx = from.cards.findIndex((c) => c.id === args.cardId);
  if (idx === -1) return null;
  const [moved] = from.cards.splice(idx, 1);
  if (!moved) return null;
  moved.columnId = to.id;

  // `to` e `from` são o mesmo objeto quando a coluna é a mesma (o splice acima já
  // removeu o card de `to.cards`). visibleDest reflete o estado pós-remoção.
  const visibleDest = to.cards.filter(isVisible);
  const anchor = visibleDest[args.destVisibleIndex];
  if (anchor) {
    to.cards.splice(
      to.cards.findIndex((c) => c.id === anchor.id),
      0,
      moved,
    );
  } else {
    to.cards.push(moved);
  }

  const sameColumn = args.fromColId === args.toColId;
  return {
    columns: cols,
    destCardIds: to.cards.map((c) => c.id),
    sourceCardIds: sameColumn ? [] : from.cards.map((c) => c.id),
  };
}

export function KanbanBoard({
  initial,
  currentUserId,
  socket,
  mutate,
  fetchSnapshot,
  fetchCardDetail,
  fetchMetrics,
}: {
  initial: BoardData;
  currentUserId: string;
  socket: Socket | null;
  mutate: KanbanMutate;
  fetchSnapshot: KanbanFetch;
  fetchCardDetail: KanbanFetchCardDetail;
  fetchMetrics: KanbanFetchMetrics;
}) {
  const [data, setData] = useState<BoardData>(initial);
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [cycleFilter, setCycleFilter] = useState<Set<string>>(new Set());
  const dock = useDockTabs();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [view, setView] = useState<"board" | "list" | "metrics" | "stories">("board");
  const [minimapOpen, setMinimapOpen] = useState(false);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);

  const minimapKey = `kerno:kanban:minimap:${data.id}`;
  useEffect(() => {
    setMinimapOpen(localStorage.getItem(minimapKey) === "1");
  }, [minimapKey]);

  const toggleMinimap = () =>
    setMinimapOpen((prev) => {
      const next = !prev;
      localStorage.setItem(minimapKey, next ? "1" : "0");
      return next;
    });

  const filtersActive =
    labelFilter.size > 0 ||
    assigneeFilter.size > 0 ||
    priorityFilter.size > 0 ||
    cycleFilter.size > 0;
  const grouped = groupBy !== "none" && view === "board";

  const clearFilters = useCallback(() => {
    setLabelFilter(new Set());
    setAssigneeFilter(new Set());
    setPriorityFilter(new Set());
    setCycleFilter(new Set());
  }, []);

  // Atalho global: Ctrl/Cmd+K abre a paleta de comandos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cardVisible = useCallback(
    (card: ColumnDTO["cards"][number]) => {
      const labelOk = labelFilter.size === 0 || card.labels.some((l) => labelFilter.has(l.id));
      const assigneeOk =
        assigneeFilter.size === 0 ||
        (card.assignedTo != null && assigneeFilter.has(card.assignedTo));
      const priorityOk = priorityFilter.size === 0 || priorityFilter.has(card.priority);
      const cycleOk =
        cycleFilter.size === 0 || (card.cycleId != null && cycleFilter.has(card.cycleId));
      return labelOk && assigneeOk && priorityOk && cycleOk;
    },
    [labelFilter, assigneeFilter, priorityFilter, cycleFilter],
  );

  const visibleColumns = useMemo(() => {
    if (!filtersActive) return data.columns;
    return data.columns.map((col) => ({ ...col, cards: col.cards.filter(cardVisible) }));
  }, [data.columns, filtersActive, cardVisible]);

  const lanes = useMemo(
    () => (grouped ? buildLanes(groupBy, visibleColumns, data.members) : []),
    [grouped, groupBy, visibleColumns, data.members],
  );

  // Mapas por id de card: o objeto (p/ renderizar o conteúdo) e metadados da aba.
  const cardsById = useMemo(() => {
    const m = new Map<string, ColumnDTO["cards"][number]>();
    for (const col of data.columns) for (const c of col.cards) m.set(c.id, c);
    return m;
  }, [data.columns]);

  const cardTabMeta = useMemo(() => {
    const m = new Map<string, { title: string; color: string }>();
    for (const col of data.columns) {
      const color = col.color ?? CATEGORY_COLOR[col.category];
      for (const c of col.cards) m.set(c.id, { title: `${data.workspaceKey}-${c.number}`, color });
    }
    return m;
  }, [data.columns, data.workspaceKey]);

  const openCard = useCallback(
    (cardId: string, opts?: { pin?: boolean }) => {
      const meta = cardTabMeta.get(cardId);
      const tab: DockTab = {
        id: cardId,
        title: meta?.title ?? cardId,
        icon: (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: meta?.color ?? "#94a3b8" }}
          />
        ),
      };
      if (opts?.pin) dock.openPinned(tab);
      else dock.openPreview(tab);
    },
    [cardTabMeta, dock],
  );

  const renderTab = useCallback(
    (tab: DockTab) => {
      const card = cardsById.get(tab.id);
      if (!card) {
        return (
          <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
            Tarefa removida.
          </div>
        );
      }
      return <CardPanelContent key={card.id} card={card} onClose={() => dock.close(tab.id)} />;
    },
    [cardsById, dock],
  );

  // Id do board ativo via ref → `refresh` permanece estável mesmo trocando de board.
  const boardIdRef = useRef(data.id);
  useEffect(() => {
    boardIdRef.current = data.id;
  }, [data.id]);

  const activeBoardKey = `kerno:boards:active:${data.workspaceId}`;

  const refresh = useCallback(async () => {
    const fresh = await fetchSnapshot(boardIdRef.current);
    if (fresh) setData(fresh);
  }, [fetchSnapshot]);

  const switchBoard = useCallback(
    async (boardId: string) => {
      if (boardId === boardIdRef.current) return;
      const fresh = await fetchSnapshot(boardId);
      if (!fresh) return;
      setData(fresh);
      dock.closeAll();
      clearFilters();
      try {
        localStorage.setItem(activeBoardKey, boardId);
      } catch {
        /* localStorage indisponível — ignora */
      }
    },
    [fetchSnapshot, activeBoardKey, clearFilters, dock],
  );

  // Restaura o último board ativo (por workspace) na montagem.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(activeBoardKey);
    } catch {
      saved = null;
    }
    if (saved && saved !== initial.id && initial.boards.some((b) => b.id === saved)) {
      void switchBoard(saved);
    }
    // Só na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateBoard = useCallback(
    async (name: string) => {
      const prevIds = new Set(data.boards.map((b) => b.id));
      const res = await mutate({ type: "createBoard", workspaceId: data.workspaceId, name });
      if (!res.ok) return res;
      const fresh = await fetchSnapshot(boardIdRef.current);
      const created = fresh?.boards.find((b) => !prevIds.has(b.id));
      if (created) await switchBoard(created.id);
      else if (fresh) setData(fresh);
      return res;
    },
    [data.boards, data.workspaceId, mutate, fetchSnapshot, switchBoard],
  );

  const handleRenameBoard = useCallback(
    async (name: string) => {
      const res = await mutate({ type: "renameBoard", boardId: boardIdRef.current, name });
      if (res.ok) await refresh();
      return res;
    },
    [mutate, refresh],
  );

  const handleDeleteBoard = useCallback(async () => {
    const current = boardIdRef.current;
    const res = await mutate({ type: "deleteBoard", boardId: current });
    if (res.ok) {
      const next = data.boards.find((b) => b.id !== current);
      if (next) await switchBoard(next.id);
    }
    return res;
  }, [mutate, data.boards, switchBoard]);

  // Mudança remota: além de refazer o snapshot, bump `remoteRev` p/ o painel da
  // tarefa aberta recarregar seu detalhe (checklists/comentários/atividade).
  const [remoteRev, setRemoteRev] = useState(0);
  const onRemoteChange = useCallback(() => {
    setRemoteRev((r) => r + 1);
    void refresh();
  }, [refresh]);

  useKanbanRealtime(socket, currentUserId, onRemoteChange);

  const onDragEnd = async (result: DropResult) => {
    if (grouped) return; // em swimlanes o arrastar fica desativado (MVP)
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Reordenar colunas (arrastar pela alça do cabeçalho).
    if (result.type === "column") {
      const reordered = structuredClone(data) as BoardData;
      const [movedCol] = reordered.columns.splice(source.index, 1);
      if (!movedCol) return;
      reordered.columns.splice(destination.index, 0, movedCol);
      reordered.columns.forEach((c, i) => (c.order = i));
      setData(reordered);
      const res = await mutate({
        type: "reorderColumns",
        boardId: data.id,
        columnIds: reordered.columns.map((c) => c.id),
      });
      if (!res.ok) await refresh();
      return;
    }

    // Move operando na lista completa, posicionando pelo índice visível — funciona
    // mesmo com filtros ativos (o DnD enxerga só os cards visíveis).
    const moved = moveCardByVisibleIndex(
      data.columns,
      {
        cardId: draggableId,
        fromColId: source.droppableId,
        toColId: destination.droppableId,
        destVisibleIndex: destination.index,
      },
      cardVisible,
    );
    if (!moved) return;

    setData({ ...data, columns: moved.columns });

    const res = await mutate({
      type: "moveCard",
      cardId: draggableId,
      fromColumnId: source.droppableId,
      toColumnId: destination.droppableId,
      destCardIds: moved.destCardIds,
      sourceCardIds: moved.sourceCardIds,
    });

    if (!res.ok) await refresh();
  };

  return (
    <KanbanProvider
      value={{
        mutate,
        refresh,
        fetchCardDetail,
        currentUserId,
        workspaceKey: data.workspaceKey,
        members: data.members,
        labels: data.labels,
        cycles: data.cycles,
        stories: data.stories,
        remoteRev,
        openCard,
        activeCardId: dock.activeId,
      }}
    >
      <TooltipProvider delayDuration={200}>
      <div className="flex h-full">
        <KanbanSidebar
          boardId={data.id}
          boardName={data.name}
          workspaceId={data.workspaceId}
          labels={data.labels}
          members={data.members}
          cycles={data.cycles}
          labelFilter={labelFilter}
          assigneeFilter={assigneeFilter}
          priorityFilter={priorityFilter}
          cycleFilter={cycleFilter}
          onToggleLabel={(id) => setLabelFilter((prev) => toggleInSet(prev, id))}
          onToggleAssignee={(id) => setAssigneeFilter((prev) => toggleInSet(prev, id))}
          onToggleCycle={(id) => setCycleFilter((prev) => toggleInSet(prev, id))}
          onTogglePriority={(p) =>
            setPriorityFilter((prev) => {
              const next = new Set(prev);
              if (next.has(p)) next.delete(p);
              else next.add(p);
              return next;
            })
          }
          onClear={clearFilters}
        />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-1.5">
            <div className="flex items-center gap-3">
              <BoardSwitcher
                boards={data.boards}
                activeId={data.id}
                activeName={data.name}
                onSwitch={switchBoard}
                onCreate={handleCreateBoard}
                onRename={handleRenameBoard}
                onDelete={handleDeleteBoard}
              />
              <div className="flex items-center rounded-md border p-0.5">
                <button
                  type="button"
                  onClick={() => setView("board")}
                  title="Quadro"
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                    view === "board" ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Quadro
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  title="Lista"
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                    view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  <List className="h-3.5 w-3.5" /> Lista
                </button>
                <button
                  type="button"
                  onClick={() => setView("metrics")}
                  title="Métricas"
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                    view === "metrics"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Métricas
                </button>
                <button
                  type="button"
                  onClick={() => setView("stories")}
                  title="Histórias"
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                    view === "stories"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <BookMarked className="h-3.5 w-3.5" /> Histórias
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Agrupar:
                <Select
                  value={groupBy}
                  disabled={view !== "board"}
                  onValueChange={(v) => setGroupBy(v as GroupBy)}
                >
                  <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="assignee">Responsável</SelectItem>
                    <SelectItem value="priority">Prioridade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground">
                {grouped
                  ? "Arrastar desativado ao agrupar."
                  : null}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {view === "board" ? (
                <button
                  type="button"
                  onClick={toggleMinimap}
                  aria-pressed={minimapOpen}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                    minimapOpen
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  title="Minimapa de colunas"
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Minimapa
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground",
                  "transition-colors hover:bg-accent hover:text-accent-foreground",
                )}
                title="Buscar (Ctrl+K)"
              >
                <Search className="h-3.5 w-3.5" />
                Buscar
                <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Ctrl K</kbd>
              </button>
            </div>
          </div>
          {view === "stories" ? (
            <StoriesView
              boardId={data.id}
              stories={data.stories}
              workspaceKey={data.workspaceKey}
              cards={data.columns.flatMap((c) => c.cards)}
            />
          ) : view === "metrics" ? (
            <KanbanMetrics boardId={data.id} fetchMetrics={fetchMetrics} />
          ) : view === "list" ? (
            <KanbanList columns={visibleColumns} />
          ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            {grouped ? (
              <div className="flex-1 space-y-6 overflow-auto px-4 py-4">
                {lanes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum card para agrupar.</p>
                ) : (
                  lanes.map((lane) => (
                    <div key={lane.key}>
                      <div className="mb-2 text-sm font-semibold">{lane.label}</div>
                      <div className="flex gap-4 overflow-x-auto pb-1">
                        {lane.columns.map((column) => (
                          <KanbanColumn
                            key={column.id}
                            column={column}
                            droppableId={`${lane.key}::${column.id}`}
                            dragDisabled
                            laneMode
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {minimapOpen ? (
                  <BoardMinimap columns={visibleColumns} scrollRef={boardScrollRef} />
                ) : null}
                <Droppable droppableId="board" direction="horizontal" type="column">
                  {(dropProvided) => (
                    <div
                      ref={(el) => {
                        dropProvided.innerRef(el);
                        boardScrollRef.current = el;
                      }}
                      {...dropProvided.droppableProps}
                      className="flex flex-1 gap-4 overflow-x-auto px-4 py-4"
                    >
                      {visibleColumns.map((column, index) => (
                        <Draggable key={column.id} draggableId={column.id} index={index}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...(dragProvided.draggableProps as HTMLAttributes<HTMLDivElement>)}
                              data-col-id={column.id}
                            >
                              <KanbanColumn
                                column={column}
                                dragDisabled={false}
                                handleProps={dragProvided.dragHandleProps}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                      <AddColumn boardId={data.id} />
                    </div>
                  )}
                </Droppable>
              </>
            )}
          </DragDropContext>
          )}
        </div>
        <TabDock
          tabs={dock.tabs}
          activeId={dock.activeId}
          onActivate={dock.activate}
          onClose={dock.close}
          onPin={dock.pin}
          renderContent={renderTab}
          storageKey="kerno:dock:board:width"
        />
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        data={data}
        onOpenCard={(id) => openCard(id, { pin: true })}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
      />
      </TooltipProvider>
    </KanbanProvider>
  );
}
