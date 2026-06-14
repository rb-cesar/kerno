"use client";

import { type HTMLAttributes, useState, useTransition } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
  cn,
} from "@kerno/ui";
import type { CardDTO } from "../types";
import { useKanban } from "./kanban-context";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function KanbanCard({ card, index }: { card: CardDTO; index: number }) {
  const { mutate, refresh, members, labels } = useKanban();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [assignedTo, setAssignedTo] = useState(card.assignedTo ?? "");
  const [labelIds, setLabelIds] = useState<string[]>(card.labels.map((l) => l.id));

  const toggleLabel = (id: string) =>
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = () =>
    startTransition(async () => {
      const res = await mutate({
        type: "updateCard",
        cardId: card.id,
        title: title.trim() || card.title,
        description: description.trim() || null,
        assignedTo: assignedTo || null,
        labelIds,
      });
      if (res.ok) {
        await refresh();
        setOpen(false);
      }
    });

  const handleDelete = () =>
    startTransition(async () => {
      const res = await mutate({ type: "deleteCard", cardId: card.id });
      if (res.ok) {
        await refresh();
        setOpen(false);
      }
    });

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <div
              ref={provided.innerRef}
              {...(provided.draggableProps as HTMLAttributes<HTMLDivElement>)}
              {...provided.dragHandleProps}
              className={cn(
                "cursor-pointer rounded-md border bg-card p-3 text-sm shadow-sm transition-colors hover:border-foreground/30",
                snapshot.isDragging && "ring-2 ring-ring",
              )}
            >
              {card.labels.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1">
                  {card.labels.map((l) => (
                    <Badge
                      key={l.id}
                      style={{ backgroundColor: l.color, color: "#fff" }}
                    >
                      {l.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="font-medium">{card.title}</div>
              {card.assignee ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                    {initials(card.assignee.name)}
                  </span>
                  {card.assignee.name}
                </div>
              ) : null}
            </div>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar card</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-title">Título</Label>
                <Input
                  id="card-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-desc">Descrição</Label>
                <Textarea
                  id="card-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-assignee">Responsável</Label>
                <select
                  id="card-assignee"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Sem responsável</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {labels.length > 0 ? (
                <div className="space-y-2">
                  <Label>Labels</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((l) => {
                      const active = labelIds.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => toggleLabel(l.id)}
                          style={
                            active ? { backgroundColor: l.color, color: "#fff" } : undefined
                          }
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs",
                            !active && "text-muted-foreground",
                          )}
                        >
                          {l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="destructive" onClick={handleDelete} disabled={pending}>
                Excluir
              </Button>
              <Button onClick={handleSave} disabled={pending}>
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Draggable>
  );
}
