"use client";

import { useCallback, useState, type ReactNode } from "react";

/** Uma aba do dock. `preview` = aba reaproveitável (VSCode), título em itálico. */
export type DockTab = { id: string; title: string; icon?: ReactNode; preview?: boolean };

export type DockController = {
  tabs: DockTab[];
  activeId: string | null;
  /** Abre em PREVIEW: reaproveita a aba preview existente (substitui no lugar). */
  openPreview: (tab: DockTab) => void;
  /** Abre/foca FIXADA (não-preview). */
  openPinned: (tab: DockTab) => void;
  /** Fixa uma aba (preview → permanente). */
  pin: (id: string) => void;
  /** Fecha; ativa o vizinho (direita, senão esquerda). */
  close: (id: string) => void;
  /** Fecha todas as abas. */
  closeAll: () => void;
  activate: (id: string) => void;
};

/**
 * Estado headless de um dock de abas estilo VSCode. Reutilizável por qualquer
 * tela (tasks hoje; outros recursos depois).
 */
export function useDockTabs(): DockController {
  const [tabs, setTabs] = useState<DockTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const openPreview = useCallback((tab: DockTab) => {
    setTabs((prev) => {
      if (prev.some((t) => t.id === tab.id)) return prev; // já aberto → só ativa
      const next = { ...tab, preview: true };
      const previewIdx = prev.findIndex((t) => t.preview);
      if (previewIdx >= 0) {
        const copy = prev.slice();
        copy[previewIdx] = next;
        return copy;
      }
      return [...prev, next];
    });
    setActiveId(tab.id);
  }, []);

  const openPinned = useCallback((tab: DockTab) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tab.id);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = { ...copy[idx]!, preview: false };
        return copy;
      }
      return [...prev, { ...tab, preview: false }];
    });
    setActiveId(tab.id);
  }, []);

  const pin = useCallback((id: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, preview: false } : t)));
  }, []);

  const close = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const next = prev.filter((t) => t.id !== id);
      setActiveId((cur) => (cur === id ? next[idx]?.id ?? next[idx - 1]?.id ?? null : cur));
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setTabs([]);
    setActiveId(null);
  }, []);

  const activate = useCallback((id: string) => setActiveId(id), []);

  return { tabs, activeId, openPreview, openPinned, pin, close, closeAll, activate };
}
