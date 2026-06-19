"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, cn } from "@kerno/ui";
import type { BoardData } from "../types";

type Item =
  | { kind: "card"; id: string; label: string; sub: string }
  | { kind: "action"; id: string; label: string; run: () => void };

/**
 * Paleta de comandos (Ctrl/Cmd+K) estilo Linear: busca cards por chave/título e
 * oferece ações rápidas. Selecionar um card abre seu detalhe; navegação por
 * teclado (↑/↓/Enter), Esc fecha.
 */
export function CommandPalette({
  open,
  onOpenChange,
  data,
  onOpenCard,
  filtersActive,
  onClearFilters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BoardData;
  onOpenCard: (cardId: string) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const cards = useMemo(
    () => data.columns.flatMap((col) => col.cards.map((card) => ({ card, columnName: col.name }))),
    [data.columns],
  );

  const results = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const items: Item[] = [];
    if (filtersActive && (q === "" || "limpar filtros".includes(q))) {
      items.push({ kind: "action", id: "clear", label: "Limpar filtros", run: onClearFilters });
    }
    for (const { card, columnName } of cards) {
      const key = `${data.projectKey}-${card.number}`;
      if (q === "" || `${key} ${card.title}`.toLowerCase().includes(q)) {
        items.push({ kind: "card", id: card.id, label: `${key}  ${card.title}`, sub: columnName });
      }
      if (items.length >= 50) break;
    }
    return items;
  }, [query, cards, data.projectKey, filtersActive, onClearFilters]);

  useEffect(() => {
    setIndex(0);
  }, [query, open]);

  const close = () => {
    onOpenChange(false);
    setQuery("");
  };

  const choose = (item: Item | undefined) => {
    if (!item) return;
    if (item.kind === "card") onOpenCard(item.id);
    else item.run();
    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Buscar</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(results[index]);
              }
            }}
            placeholder="Buscar card ou ação…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nada encontrado.
            </li>
          ) : (
            results.map((item, i) => (
              <li key={`${item.kind}:${item.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm",
                    i === index ? "bg-accent text-accent-foreground" : "text-foreground",
                  )}
                >
                  {item.kind === "card" ? (
                    <>
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {item.sub}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{item.label}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
