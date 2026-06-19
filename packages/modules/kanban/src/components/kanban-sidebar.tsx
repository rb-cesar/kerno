"use client";

import { cn } from "@kerno/ui";
import type { CycleDTO, LabelDTO, MemberDTO, Priority } from "../types";
import { LabelManager } from "./label-manager";
import { CycleManager } from "./cycle-manager";
import { PRIORITY_META } from "./meta";

const PRIORITY_FILTERS: Exclude<Priority, "NONE">[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

/**
 * Menu lateral do hub Kanban (2ª coluna do shell): filtros (responsável,
 * etiqueta, prioridade, cycle) + gestão de etiquetas e cycles. O arrastar
 * continua funcionando com filtros ativos (o board mapeia o índice visível para
 * a lista completa — ver moveCardByVisibleIndex).
 */
export function KanbanSidebar({
  boardId,
  boardName,
  projectId,
  labels,
  members,
  cycles,
  labelFilter,
  assigneeFilter,
  priorityFilter,
  cycleFilter,
  onToggleLabel,
  onToggleAssignee,
  onTogglePriority,
  onToggleCycle,
  onClear,
}: {
  boardId: string;
  boardName: string;
  projectId: string;
  labels: LabelDTO[];
  members: MemberDTO[];
  cycles: CycleDTO[];
  labelFilter: Set<string>;
  assigneeFilter: Set<string>;
  priorityFilter: Set<Priority>;
  cycleFilter: Set<string>;
  onToggleLabel: (id: string) => void;
  onToggleAssignee: (id: string) => void;
  onTogglePriority: (p: Priority) => void;
  onToggleCycle: (id: string) => void;
  onClear: () => void;
}) {
  const active =
    labelFilter.size > 0 ||
    assigneeFilter.size > 0 ||
    priorityFilter.size > 0 ||
    cycleFilter.size > 0;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r">
      <div className="border-b px-3 py-3">
        <div className="truncate text-sm font-semibold">{boardName}</div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Filtros</span>
          {active ? (
            <button
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Responsável</div>
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum membro.</p>
          ) : (
            <div className="space-y-0.5">
              {members.map((m) => {
                const on = assigneeFilter.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => onToggleAssignee(m.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors",
                      on
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <span className="truncate">{m.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Prioridade</div>
          <div className="flex flex-wrap gap-1">
            {PRIORITY_FILTERS.map((p) => {
              const meta = PRIORITY_META[p];
              const on = priorityFilter.has(p);
              return (
                <button
                  key={p}
                  onClick={() => onTogglePriority(p)}
                  style={
                    on
                      ? { backgroundColor: meta.color, borderColor: meta.color, color: "#fff" }
                      : { borderColor: meta.color, color: meta.color }
                  }
                  className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Etiquetas</div>
          {labels.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma etiqueta.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {labels.map((l) => {
                const on = labelFilter.has(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => onToggleLabel(l.id)}
                    style={
                      on
                        ? { backgroundColor: l.color, borderColor: l.color, color: "#fff" }
                        : { borderColor: l.color, color: l.color }
                    }
                    className="rounded-full border px-2 py-0.5 text-xs"
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {cycles.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">Cycle</div>
            <div className="space-y-0.5">
              {cycles.map((c) => {
                const on = cycleFilter.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => onToggleCycle(c.id)}
                    className={cn(
                      "flex w-full items-center rounded-md px-2 py-1 text-left text-sm transition-colors",
                      on
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t p-3">
        <CycleManager projectId={projectId} />
        <LabelManager boardId={boardId} />
      </div>
    </aside>
  );
}
