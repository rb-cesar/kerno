"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, DatePicker, Input, cn } from "@kerno/ui";
import { useKanban } from "./kanban-context";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** GestÃ£o de cycles/sprints na sidebar: criar (nome + perÃ­odo) e excluir. */
export function CycleManager({ workspaceId }: { workspaceId: string }) {
  const { mutate, refresh, cycles } = useKanban();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [pending, startTransition] = useTransition();

  const create = () => {
    if (!name.trim() || !startsAt || !endsAt) return;
    startTransition(async () => {
      const res = await mutate({
        type: "createCycle",
        workspaceId,
        name: name.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      if (res.ok) {
        setName("");
        setStartsAt("");
        setEndsAt("");
        setOpen(false);
        await refresh();
      }
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await mutate({ type: "deleteCycle", cycleId: id });
      if (res.ok) await refresh();
    });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Cycles</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
          title="Novo cycle"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {cycles.length > 0 ? (
        <ul className="space-y-0.5">
          {cycles.map((c) => (
            <li
              key={c.id}
              className="group flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="flex-1 truncate">{c.name}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {fmt(c.startsAt)}â€“{fmt(c.endsAt)}
              </span>
              <button
                onClick={() => remove(c.id)}
                disabled={pending}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                title="Excluir cycle"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("text-xs text-muted-foreground", open && "hidden")}>Nenhum cycle.</p>
      )}

      {open ? (
        <div className="space-y-1.5 rounded-md border p-2">
          <Input
            autoFocus
            value={name}
            placeholder="Nome (ex.: Sprint 1)"
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
            className="h-8"
          />
          <div className="flex gap-1.5">
            <DatePicker
              value={startsAt}
              disabled={pending}
              onChange={setStartsAt}
              placeholder="InÃ­cio"
              className="h-8"
            />
            <DatePicker
              value={endsAt}
              disabled={pending}
              onChange={setEndsAt}
              placeholder="Fim"
              className="h-8"
            />
          </div>
          <Button size="sm" className="w-full" disabled={pending} onClick={create}>
            Criar cycle
          </Button>
        </div>
      ) : null}
    </div>
  );
}
