"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button, Input } from "@kerno/ui";
import { useKanban } from "./kanban-context";

export function AddColumn({ boardId }: { boardId: string }) {
  const { mutate, refresh } = useKanban();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = name.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    startTransition(async () => {
      const res = await mutate({ type: "createColumn", boardId, name: value });
      if (res.ok) {
        setName("");
        setAdding(false);
        await refresh();
      }
    });
  };

  return (
    <div className="w-72 shrink-0">
      {adding ? (
        <Input
          autoFocus
          value={name}
          placeholder="Nome da coluna"
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setAdding(false);
          }}
        />
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setAdding(true)}
        >
          <Plus /> Adicionar coluna
        </Button>
      )}
    </div>
  );
}
