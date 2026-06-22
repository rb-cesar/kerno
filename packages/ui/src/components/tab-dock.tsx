"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../utils";
import type { DockTab } from "../hooks/use-dock-tabs";

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Dock de abas à direita, estilo VSCode: tira de abas (preview em itálico, fixar
 * com duplo-clique, fechar com X ou botão do meio), largura redimensionável por
 * arrastar a borda esquerda (persistida) e conteúdo por aba — todas montadas, só a
 * ativa visível (preserva o estado de edição ao alternar). Genérico: o conteúdo
 * vem por `renderContent`.
 */
export function TabDock({
  tabs,
  activeId,
  onActivate,
  onClose,
  onPin,
  renderContent,
  storageKey,
  defaultWidth = 640,
  minWidth = 380,
  maxWidth = 1100,
}: {
  tabs: DockTab[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onPin: (id: string) => void;
  renderContent: (tab: DockTab) => ReactNode;
  storageKey?: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const drag = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    const saved = Number(localStorage.getItem(storageKey));
    if (Number.isFinite(saved) && saved > 0) setWidth(clamp(saved, minWidth, maxWidth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { startX: e.clientX, startW: width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    // Borda esquerda: arrastar p/ a esquerda (dx<0) aumenta a largura.
    const dx = e.clientX - drag.current.startX;
    setWidth(clamp(drag.current.startW - dx, minWidth, maxWidth));
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (storageKey) localStorage.setItem(storageKey, String(width));
  };

  if (tabs.length === 0) return null;

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-l bg-background duration-200 animate-in slide-in-from-right"
      style={{ width }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute left-0 top-0 z-20 h-full w-1.5 -translate-x-1/2 cursor-col-resize transition-colors hover:bg-primary/40"
        title="Arraste para redimensionar"
      />

      {/* Tira de abas */}
      <div className="flex items-stretch overflow-x-auto border-b bg-muted/30">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => onActivate(tab.id)}
              onDoubleClick={() => onPin(tab.id)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onClose(tab.id);
                }
              }}
              title={tab.title}
              className={cn(
                "group flex max-w-[12rem] shrink-0 cursor-pointer select-none items-center gap-1.5 border-r px-3 py-1.5 text-xs",
                active
                  ? "bg-background text-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.icon}
              <span className={cn("truncate", tab.preview && "italic")}>{tab.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                aria-label="Fechar aba"
                title="Fechar"
                className={cn(
                  "ml-1 shrink-0 rounded p-0.5 hover:bg-accent hover:text-accent-foreground",
                  active ? "opacity-70" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Conteúdo: todas as abas montadas; só a ativa visível (preserva edição). */}
      <div className="relative min-h-0 flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn("absolute inset-0 flex flex-col", tab.id === activeId ? "" : "hidden")}
          >
            {renderContent(tab)}
          </div>
        ))}
      </div>
    </aside>
  );
}
