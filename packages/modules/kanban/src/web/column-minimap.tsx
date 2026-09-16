"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { cn } from "@kerno/ui";
import type { ColumnDTO } from "../types";
import { CATEGORY_COLOR, PRIORITY_META } from "./meta";

/**
 * Minimapa do board estilo VSCode: preview em miniatura das colunas e seus cards
 * (blocos coloridos) com um retângulo de viewport sincronizado ao scroll
 * HORIZONTAL do board. Clicar/arrastar o retângulo navega. Bidirecional: rolar o
 * board move o retângulo; mover o retângulo rola o board.
 */
export function BoardMinimap({
  columns,
  scrollRef,
}: {
  columns: ColumnDTO[];
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const [view, setView] = useState({ left: 0, width: 100 });
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  // Board → minimapa: reflete o scroll/tamanho atual no retângulo.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollWidth <= 0) return;
      setView({
        left: (scrollLeft / scrollWidth) * 100,
        width: Math.min(100, (clientWidth / scrollWidth) * 100),
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollRef, columns]);

  // Minimapa → board: centraliza o scroll no ponto clicado/arrastado.
  const scrollToClientX = (clientX: number) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const target = ratio * el.scrollWidth - el.clientWidth / 2;
    el.scrollTo({
      left: Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth)),
      behavior: dragging.current ? "auto" : "smooth",
    });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrollToClientX(e.clientX);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) scrollToClientX(e.clientX);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (columns.length === 0) return null;

  return (
    <div className="border-b bg-muted/30 px-4 py-2">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative flex h-16 cursor-pointer gap-1 overflow-hidden rounded select-none"
        title="Clique ou arraste para navegar"
      >
        {columns.map((column) => (
          <div key={column.id} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div
              className="h-1 w-full shrink-0 rounded-sm"
              style={{ backgroundColor: column.color ?? CATEGORY_COLOR[column.category] }}
            />
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
              {column.cards.slice(0, 24).map((card) =>
                card.priority !== "NONE" ? (
                  <div
                    key={card.id}
                    className="h-1.5 w-full shrink-0 rounded-[1px] opacity-80"
                    style={{ backgroundColor: PRIORITY_META[card.priority].color }}
                  />
                ) : (
                  <div
                    key={card.id}
                    className="h-1.5 w-full shrink-0 rounded-[1px] bg-muted-foreground/40"
                  />
                ),
              )}
            </div>
          </div>
        ))}

        {/* Retângulo de viewport (reflete o scroll horizontal do board). */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 rounded-sm border-2 border-primary/70 bg-primary/10",
          )}
          style={{ left: `${view.left}%`, width: `${view.width}%` }}
        />
      </div>
    </div>
  );
}
