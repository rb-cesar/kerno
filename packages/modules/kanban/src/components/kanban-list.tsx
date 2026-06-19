"use client";

import { CalendarClock } from "lucide-react";
import { Badge, cn } from "@kerno/ui";
import type { ColumnDTO } from "../types";
import { useKanban } from "./kanban-context";
import { CATEGORY_COLOR, PRIORITY_META, formatDue, initials, isOverdue } from "./meta";

/** Visão em lista: cards agrupados por estado (coluna), em linhas clicáveis. */
export function KanbanList({ columns }: { columns: ColumnDTO[] }) {
  const { projectKey, setOpenCardId } = useKanban();
  const visible = columns.filter((c) => c.cards.length > 0);

  if (visible.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Nenhum card.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-3xl space-y-5">
        {visible.map((column) => (
          <div key={column.id}>
            <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR[column.category] }}
              />
              {column.name}
              <span className="text-xs font-normal text-muted-foreground">
                {column.cards.length}
              </span>
            </div>
            <ul className="divide-y rounded-md border">
              {column.cards.map((card) => {
                const prio = card.priority !== "NONE" ? PRIORITY_META[card.priority] : null;
                const overdue = card.dueDate ? isOverdue(card.dueDate) : false;
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => setOpenCardId(card.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: prio?.color ?? "transparent" }}
                        title={prio ? `Prioridade: ${prio.label}` : "Sem prioridade"}
                      />
                      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                        {projectKey}-{card.number}
                      </span>
                      <span className="flex-1 truncate">{card.title}</span>
                      {card.labels.map((l) => (
                        <Badge key={l.id} style={{ backgroundColor: l.color, color: "#fff" }}>
                          {l.name}
                        </Badge>
                      ))}
                      {card.dueDate ? (
                        <span
                          className={cn(
                            "flex shrink-0 items-center gap-1 text-xs text-muted-foreground",
                            overdue && "text-destructive",
                          )}
                        >
                          <CalendarClock className="h-3 w-3" />
                          {formatDue(card.dueDate)}
                        </span>
                      ) : null}
                      {card.estimate != null ? (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                          {card.estimate} pt
                        </span>
                      ) : null}
                      {card.assignee ? (
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium"
                          title={card.assignee.name}
                        >
                          {initials(card.assignee.name)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
