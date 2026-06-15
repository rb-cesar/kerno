"use client";

import { useState, useTransition } from "react";
import { Tag, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@kerno/ui";
import { useKanban } from "./kanban-context";

export function LabelManager({ boardId }: { boardId: string }) {
  const { labels, mutate, refresh } = useKanban();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [pending, startTransition] = useTransition();

  const add = () => {
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await mutate({ type: "createLabel", boardId, name: value, color });
      if (res.ok) {
        setName("");
        await refresh();
      }
    });
  };

  const remove = (labelId: string) =>
    startTransition(async () => {
      const res = await mutate({ type: "deleteLabel", labelId });
      if (res.ok) await refresh();
    });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag /> Labels
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Labels do board</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {labels.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma label ainda.</p>
          ) : (
            labels.map((l) => (
              <div key={l.id} className="flex items-center justify-between">
                <Badge style={{ backgroundColor: l.color, color: "#fff" }}>{l.name}</Badge>
                <button
                  onClick={() => remove(l.id)}
                  disabled={pending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t pt-4">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded border border-input bg-transparent"
          />
          <Input
            value={name}
            placeholder="Nova label"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <Button onClick={add} disabled={pending}>
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
