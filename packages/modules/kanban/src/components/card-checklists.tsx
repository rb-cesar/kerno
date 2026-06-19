"use client";

import { useState, useTransition } from "react";
import { ListChecks, Plus, Trash2, X } from "lucide-react";
import { Button, Checkbox, Input, Label, cn } from "@kerno/ui";
import type { ChecklistDTO, KanbanCommand, KanbanMutationResult } from "../types";

type Mutate = (command: KanbanCommand) => Promise<KanbanMutationResult>;

/** Seção de todolists (checklists) do card — múltiplas, com título de grupo opcional. */
export function CardChecklists({
  checklists,
  cardId,
  mutate,
  reload,
}: {
  checklists: ChecklistDTO[];
  cardId: string;
  mutate: Mutate;
  reload: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  const run = (command: KanbanCommand) =>
    startTransition(async () => {
      const res = await mutate(command);
      if (res.ok) await reload();
    });

  return (
    <div className="space-y-3 border-t pt-4">
      <Label className="flex items-center gap-1.5">
        <ListChecks className="h-3.5 w-3.5" /> Checklists
      </Label>

      {checklists.map((cl) => (
        <ChecklistBlock key={cl.id} checklist={cl} pending={pending} run={run} />
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run({ type: "createChecklist", cardId })}
      >
        <Plus /> Nova checklist
      </Button>
    </div>
  );
}

function ChecklistBlock({
  checklist,
  pending,
  run,
}: {
  checklist: ChecklistDTO;
  pending: boolean;
  run: (command: KanbanCommand) => void;
}) {
  const [title, setTitle] = useState(checklist.title ?? "");
  const [newItem, setNewItem] = useState("");

  const done = checklist.items.filter((i) => i.done).length;
  const total = checklist.items.length;

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    setNewItem("");
    run({ type: "addChecklistItem", checklistId: checklist.id, text });
  };

  const commitTitle = () => {
    const next = title.trim();
    if (next === (checklist.title ?? "")) return;
    run({ type: "renameChecklist", checklistId: checklist.id, title: next || null });
  };

  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          placeholder="Título do grupo (opcional)"
          disabled={pending}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-8 border-transparent px-1 font-medium shadow-none focus-visible:border-input"
        />
        {total > 0 ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {done}/{total}
          </span>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => run({ type: "deleteChecklist", checklistId: checklist.id })}
          className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
          title="Excluir checklist"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {checklist.items.length > 0 ? (
        <ul className="space-y-1">
          {checklist.items.map((item) => (
            <li key={item.id} className="group flex items-center gap-2">
              <Checkbox
                checked={item.done}
                disabled={pending}
                onCheckedChange={(c) =>
                  run({ type: "toggleChecklistItem", itemId: item.id, done: c === true })
                }
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  item.done && "text-muted-foreground line-through",
                )}
              >
                {item.text}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run({ type: "deleteChecklistItem", itemId: item.id })}
                className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
                title="Remover item"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <Input
          value={newItem}
          placeholder="Adicionar item"
          disabled={pending}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          className="h-8"
        />
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={pending} onClick={addItem}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
