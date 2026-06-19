"use client";

import { cn } from "@kerno/ui";
import type { ColumnDTO } from "../types";
import { CATEGORY_COLOR } from "./meta";

/**
 * Minimapa horizontal de navegação das colunas (inspirado no Jira). Cada segmento
 * representa uma coluna (nome + nº de cards); clicar rola o board até ela.
 * Recolhível pelo board (estado persistido em localStorage).
 */
export function ColumnMinimap({
  columns,
  onJump,
}: {
  columns: ColumnDTO[];
  onJump: (columnId: string) => void;
}) {
  if (columns.length === 0) return null;

  return (
    <div className="flex items-stretch gap-1 border-b bg-muted/30 px-4 py-1.5">
      {columns.map((column) => (
        <button
          key={column.id}
          type="button"
          onClick={() => onJump(column.id)}
          title={`${column.name} · ${column.cards.length}`}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded border bg-background px-2 py-1",
            "text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: column.color ?? CATEGORY_COLOR[column.category] }}
          />
          <span className="truncate">{column.name}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">{column.cards.length}</span>
        </button>
      ))}
    </div>
  );
}
