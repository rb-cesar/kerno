"use client";

import { useState, useTransition } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, cn } from "@kerno/ui";
import type { ColumnDTO } from "../types";
import { useKanban } from "./kanban-context";
import { KanbanCard } from "./kanban-card";

function AddCard({ columnId }: { columnId: string }) {
  const { mutate, refresh } = useKanban();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
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
        await refresh();
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
    <Input
      autoFocus
      value={title}
      placeholder="Título do card"
      disabled={pending}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") setAdding(false);
      }}
    />
  );
}

export function KanbanColumn({ column }: { column: ColumnDTO }) {
  const { mutate, refresh } = useKanban();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [, startTransition] = useTransition();

  const rename = () => {
    setEditing(false);
    const value = name.trim();
    if (!value || value === column.name) {
      setName(column.name);
      return;
    }
    startTransition(async () => {
      const res = await mutate({ type: "renameColumn", columnId: column.id, name: value });
      if (res.ok) await refresh();
    });
  };

  const remove = () => {
    if (!confirm(`Excluir a coluna "${column.name}" e seus cards?`)) return;
    startTransition(async () => {
      const res = await mutate({ type: "deleteColumn", columnId: column.id });
      if (res.ok) await refresh();
    });
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between gap-2 p-2">
        {editing ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename();
              if (e.key === "Escape") {
                setName(column.name);
                setEditing(false);
              }
            }}
            className="h-7"
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-semibold"
            onClick={() => setEditing(true)}
          >
            {column.name}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {column.cards.length}
            </span>
          </button>
        )}
        <button
          onClick={remove}
          className="text-muted-foreground hover:text-destructive"
          title="Excluir coluna"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 space-y-2 overflow-y-auto px-2 pb-2",
              snapshot.isDraggingOver && "bg-accent/40",
            )}
          >
            {column.cards.map((card, index) => (
              <KanbanCard key={card.id} card={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="p-2 pt-0">
        <AddCard columnId={column.id} />
      </div>
    </div>
  );
}
