"use client";

import { useEffect, useState } from "react";
import type { BoardMetricsDTO, KanbanFetchMetrics } from "../types";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Painel de métricas de fluxo do board (Kanban): throughput, cycle/lead, WIP. */
export function KanbanMetrics({
  boardId,
  fetchMetrics,
}: {
  boardId: string;
  fetchMetrics: KanbanFetchMetrics;
}) {
  const [metrics, setMetrics] = useState<BoardMetricsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchMetrics(boardId).then((d) => {
      if (active) {
        setMetrics(d);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [boardId, fetchMetrics]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Carregando métricas…
      </div>
    );
  }
  if (!metrics) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Não foi possível carregar as métricas.
      </div>
    );
  }

  const maxCount = Math.max(1, ...metrics.throughput.map((t) => t.count));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Concluídos" value={metrics.completedCount} />
          <Stat label="Em progresso (WIP)" value={metrics.wip} />
          <Stat
            label="Cycle time médio"
            value={metrics.avgCycleTimeDays != null ? `${metrics.avgCycleTimeDays} d` : "—"}
          />
          <Stat
            label="Lead time médio"
            value={metrics.avgLeadTimeDays != null ? `${metrics.avgLeadTimeDays} d` : "—"}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Throughput — concluídos por semana</h3>
          <div className="flex h-44 items-end gap-2 rounded-lg border p-3">
            {metrics.throughput.map((t) => (
              <div key={t.weekStart} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">{t.count}</span>
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${t.count === 0 ? 0 : Math.max(4, (t.count / maxCount) * 100)}%` }}
                  title={`Semana de ${weekLabel(t.weekStart)}: ${t.count}`}
                />
                <span className="text-[10px] text-muted-foreground">{weekLabel(t.weekStart)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Cycle time = 1º “em progresso” → 1ª conclusão. Lead time = criação → 1ª conclusão.
          </p>
        </div>
      </div>
    </div>
  );
}
