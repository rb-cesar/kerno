"use client";

import { useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  cn,
} from "@kerno/ui";
import type { BoardSummaryDTO } from "../types";

const MAX_BOARDS = 5;

/**
 * Seletor de boards do workspace: troca o board ativo, cria (até o limite),
 * renomeia e exclui. As ações chamam handlers do board (que falam com a API e
 * refazem o snapshot).
 */
export function BoardSwitcher({
  boards,
  activeId,
  activeName,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: {
  boards: BoardSummaryDTO[];
  activeId: string;
  activeName: string;
  onSwitch: (boardId: string) => void;
  onCreate: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onRename: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const [dialog, setDialog] = useState<null | "create" | "rename">(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const atLimit = boards.length >= MAX_BOARDS;

  const openCreate = () => {
    setName("");
    setError(null);
    setDialog("create");
  };
  const openRename = () => {
    setName(activeName);
    setError(null);
    setDialog("rename");
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe um nome.");
      return;
    }
    setBusy(true);
    const res = dialog === "create" ? await onCreate(trimmed) : await onRename(trimmed);
    setBusy(false);
    if (res.ok) setDialog(null);
    else setError(res.error ?? "Não foi possível concluir.");
  };

  const remove = async () => {
    if (!confirm(`Excluir o board "${activeName}"? As tarefas dele serão removidas.`)) return;
    const res = await onDelete();
    if (!res.ok) alert(res.error ?? "Não foi possível excluir.");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Trocar de board"
          >
            {activeName}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {boards.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => onSwitch(b.id)}
              className="flex items-center gap-2"
            >
              <Check
                className={cn("h-3.5 w-3.5", b.id === activeId ? "opacity-100" : "opacity-0")}
              />
              <span className="truncate">{b.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openRename}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Renomear board
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={openCreate}
            disabled={atLimit}
            title={atLimit ? `Limite de ${MAX_BOARDS} boards` : undefined}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Novo board {atLimit ? `(${MAX_BOARDS}/${MAX_BOARDS})` : ""}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={remove}
            disabled={boards.length <= 1}
            className="text-destructive focus:text-destructive"
            title={boards.length <= 1 ? "É o único board do workspace" : undefined}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "Novo board" : "Renomear board"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              value={name}
              placeholder="Nome do board"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={busy}>
              {dialog === "create" ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
