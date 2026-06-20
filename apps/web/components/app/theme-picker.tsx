"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
} from "@kerno/ui";
import { DEFAULT_THEME, THEME_GROUPS, type ThemeMeta } from "@/lib/themes";

/**
 * Seletor de temas estilo Discord: um grid de cards com mini-preview ao vivo.
 * Controlado pelo componente pai (ex. UserMenu).
 */
export function ThemePicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // O tema só é conhecido no cliente (localStorage); evita mismatch de hidratação.
  useEffect(() => setMounted(true), []);

  const current = mounted ? (theme ?? DEFAULT_THEME) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aparência</DialogTitle>
          <DialogDescription>
            Escolha um tema. A mudança é aplicada na hora e fica salva neste navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {THEME_GROUPS.map(({ group, themes }) => (
            <section key={group}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {themes.map((t) => (
                  <ThemeCard
                    key={t.id}
                    theme={t}
                    selected={current === t.id}
                    onSelect={() => setTheme(t.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  const { bg, sidebar, header, accent, fg } = theme.swatch;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={theme.description}
      className={cn(
        "group relative overflow-hidden rounded-lg border text-left outline-none transition",
        "focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary ring-2 ring-primary"
          : "border-border hover:border-muted-foreground/50",
      )}
    >
      {/* Mini-preview: réplica em miniatura do layout (header + barra de hubs +
          conteúdo), pintada com as superfícies reais do tema. */}
      <div className="h-20 w-full" style={{ backgroundColor: bg }}>
        {/* header */}
        <div
          className="flex h-3 w-full items-center gap-1 px-1.5"
          style={{ backgroundColor: header }}
        >
          <span className="h-1 w-6 rounded-full" style={{ backgroundColor: fg, opacity: 0.5 }} />
        </div>
        <div className="flex h-[68px]">
          {/* barra de hubs */}
          <div
            className="flex w-4 flex-col items-center gap-1 py-1.5"
            style={{ backgroundColor: sidebar }}
          >
            <span className="h-1.5 w-1.5 rounded-[3px]" style={{ backgroundColor: accent }} />
            <span className="h-1.5 w-1.5 rounded-[3px]" style={{ backgroundColor: fg, opacity: 0.45 }} />
          </div>
          {/* conteúdo */}
          <div className="flex flex-1 flex-col gap-1.5 p-2">
            <span className="h-2 w-3/5 rounded-full" style={{ backgroundColor: accent }} />
            <span className="h-1.5 w-full rounded-full" style={{ backgroundColor: fg, opacity: 0.55 }} />
            <span className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: fg, opacity: 0.35 }} />
            <span className="mt-auto h-3 w-10 rounded" style={{ backgroundColor: accent }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-2.5 py-2">
        <span className="truncate text-sm font-medium text-card-foreground">{theme.label}</span>
        {selected ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </button>
  );
}
