"use client";

import { cn } from "@kerno/ui";
import type { LabelDTO, MemberDTO } from "../types";
import { LabelManager } from "./label-manager";

/**
 * Menu lateral do hub Kanban (2ª coluna do shell): filtros por responsável e
 * etiqueta + gestão de etiquetas. Os filtros são uma visão read-only — enquanto
 * houver filtro ativo, o board desabilita o arrastar (índices deixam de bater
 * com a ordem real).
 */
export function KanbanSidebar({
  boardId,
  boardName,
  labels,
  members,
  labelFilter,
  assigneeFilter,
  onToggleLabel,
  onToggleAssignee,
  onClear,
}: {
  boardId: string;
  boardName: string;
  labels: LabelDTO[];
  members: MemberDTO[];
  labelFilter: Set<string>;
  assigneeFilter: Set<string>;
  onToggleLabel: (id: string) => void;
  onToggleAssignee: (id: string) => void;
  onClear: () => void;
}) {
  const active = labelFilter.size > 0 || assigneeFilter.size > 0;

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
      </div>

      <div className="border-t p-3">
        <LabelManager boardId={boardId} />
      </div>
    </aside>
  );
}
