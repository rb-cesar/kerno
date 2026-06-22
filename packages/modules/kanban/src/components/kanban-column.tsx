"use client";

import { useState, useTransition } from "react";
import { Droppable, type DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { GripVertical, Plus, Settings2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@kerno/ui";
import type { ColumnDTO, StatusCategory } from "../types";
import { useKanban } from "./kanban-context";
import { KanbanCard } from "./kanban-card";

// Cor + rótulo por categoria do estado (coluna).
const CATEGORY_COLOR: Record<StatusCategory, string> = {
  BACKLOG: "#94a3b8",
  UNSTARTED: "#64748b",
  STARTED: "#3b82f6",
  COMPLETED: "#22c55e",
  CANCELED: "#ef4444",
};
const CATEGORY_ORDER: StatusCategory[] = [
  "BACKLOG",
  "UNSTARTED",
  "STARTED",
  "COMPLETED",
  "CANCELED",
];
const CATEGORY_LABEL: Record<StatusCategory, string> = {
  BACKLOG: "Backlog",
  UNSTARTED: "A fazer",
  STARTED: "Em progresso",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

function AddCard({ columnId }: { columnId: string }) {
  const { mutate, refresh } = useKanban();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = title.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    startTransition(async () => {
      const res = await mutate({ type: "createCard", columnId, title: value });
      if (res.ok) {
        setTitle("");
        setError(null);
        await refresh();
      } else {
        setError(res.error ?? "Não foi possível criar o card.");
      }
    });
  };

  if (!adding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setAdding(true)}
      >
        <Plus /> Adicionar card
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        autoFocus
        value={title}
        placeholder="Título do card"
        disabled={pending}
        onChange={(e) => {
          setTitle(e.target.value);
          if (error) setError(null);
        }}
        onBlur={() => {
          if (!error) submit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setAdding(false);
            setError(null);
          }
        }}
      />
      {error ? <p className="px-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Dialog de configuração da coluna: nome, categoria, limite de WIP e excluir. */
function ColumnSettings({ column }: { column: ColumnDTO }) {
  const { mutate, refresh } = useKanban();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(column.name);
  const [category, setCategory] = useState<StatusCategory>(column.category);
  const [wip, setWip] = useState<string>(column.wipLimit?.toString() ?? "");

  const save = () =>
    startTransition(async () => {
      const wipNum = wip.trim() === "" ? null : Number.parseInt(wip, 10);
      const res = await mutate({
        type: "updateColumn",
        columnId: column.id,
        name: name.trim() || column.name,
        category,
        wipLimit: wipNum != null && Number.isFinite(wipNum) && wipNum > 0 ? wipNum : null,
      });
      if (res.ok) {
        await refresh();
        setOpen(false);
      }
    });

  const remove = () =>
    startTransition(async () => {
      const res = await mutate({ type: "deleteColumn", columnId: column.id });
      if (res.ok) {
        await refresh();
        setOpen(false);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground"
        title="Configurar coluna"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar coluna</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="col-name">Nome</Label>
            <Input id="col-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="col-category">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as StatusCategory)}>
                <SelectTrigger id="col-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-wip">Limite de WIP</Label>
              <Input
                id="col-wip"
                type="number"
                min={0}
                placeholder="Sem limite"
                value={wip}
                onChange={(e) => setWip(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="destructive" onClick={remove} disabled={pending}>
            Excluir coluna
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KanbanColumn({
  column,
  dragDisabled = false,
  handleProps,
  droppableId,
  laneMode = false,
}: {
  column: ColumnDTO;
  dragDisabled?: boolean;
  handleProps?: DraggableProvidedDragHandleProps | null;
  /** Id do Droppable (em swimlanes precisa ser único por faixa). Default = column.id. */
  droppableId?: string;
  /** Modo faixa: altura automática, sem alça de arraste, settings nem add-card. */
  laneMode?: boolean;
}) {
  const overLimit = column.wipLimit != null && column.cards.length > column.wipLimit;

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg bg-muted/40",
        laneMode ? "self-start" : "h-full",
      )}
    >
      <div className="flex items-center justify-between gap-2 p-2">
        <div
          {...(laneMode ? {} : handleProps)}
          className="flex flex-1 items-center gap-1.5 text-sm font-semibold"
        >
          {laneMode ? null : (
            <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/60" />
          )}
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: CATEGORY_COLOR[column.category] }}
            title={CATEGORY_LABEL[column.category]}
          />
          <span className="truncate">{column.name}</span>
          <span
            className={cn(
              "text-xs font-normal text-muted-foreground",
              overLimit && "font-semibold text-destructive",
            )}
            title={column.wipLimit != null ? `Limite de WIP: ${column.wipLimit}` : undefined}
          >
            {column.wipLimit != null
              ? `${column.cards.length}/${column.wipLimit}`
              : column.cards.length}
          </span>
        </div>
        {laneMode ? null : <ColumnSettings column={column} />}
      </div>

      <Droppable droppableId={droppableId ?? column.id} isDropDisabled={laneMode}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-2 px-2 pb-2",
              laneMode ? "min-h-[1.5rem]" : "flex-1 overflow-y-auto",
              snapshot.isDraggingOver && "bg-accent/40",
              overLimit && "outline outline-1 outline-destructive/40",
            )}
          >
            {column.cards.map((card, index) => (
              <KanbanCard key={card.id} card={card} index={index} dragDisabled={dragDisabled} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {laneMode ? null : (
        <div className="p-2 pt-0">
          <AddCard columnId={column.id} />
        </div>
      )}
    </div>
  );
}
