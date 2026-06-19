"use client";

import { Suspense, lazy, useEffect, useState, useTransition } from "react";
import { BookMarked, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Combobox,
  DatePicker,
  Field,
  FieldControl,
  FieldLabel,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@kerno/ui";
import type { CardDTO, Priority, StatusCategory, StoryDTO } from "../types";
import { useKanban } from "./kanban-context";
import { CATEGORY_COLOR, PRIORITY_LABEL, PRIORITY_ORDER, toDateInput } from "./meta";

// Lazy: o editor Lexical só baixa ao abrir uma história (mantém a aba leve).
const RichTextEditor = lazy(() =>
  import("@kerno/editor").then((m) => ({ default: m.RichTextEditor })),
);

const STATUS_ORDER: StatusCategory[] = [
  "BACKLOG",
  "UNSTARTED",
  "STARTED",
  "COMPLETED",
  "CANCELED",
];
const STATUS_LABEL: Record<StatusCategory, string> = {
  BACKLOG: "Backlog",
  UNSTARTED: "A fazer",
  STARTED: "Em progresso",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

const SWATCHES = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#a855f7"];

/** Aba "Histórias": lista de User Stories (esquerda) + editor inline (direita). */
export function StoriesView({
  boardId,
  stories,
  projectKey,
  cards,
}: {
  boardId: string;
  stories: StoryDTO[];
  projectKey: string;
  cards: CardDTO[];
}) {
  const { mutate, refresh } = useKanban();
  const [selectedId, setSelectedId] = useState<string | null>(stories[0]?.id ?? null);
  const [pending, startTransition] = useTransition();

  const selected = stories.find((s) => s.id === selectedId) ?? null;

  const createStory = () =>
    startTransition(async () => {
      const res = await mutate({ type: "createStory", boardId, title: "Nova história" });
      if (res.ok) await refresh();
    });

  return (
    <div className="flex min-h-0 flex-1">
      {/* Lista */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Histórias</span>
          <Button size="sm" variant="outline" disabled={pending} onClick={createStory}>
            <Plus /> Nova
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {stories.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              Nenhuma história ainda.
            </p>
          ) : (
            stories.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-accent",
                    s.id === selectedId && "bg-accent",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-3.5 w-3.5 shrink-0" style={{ color: s.color ?? undefined }} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {projectKey}-S{s.number}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{s.taskCount} 🗂</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm">{s.title}</div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Editor */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selected ? (
          <StoryEditor
            key={selected.id}
            story={selected}
            projectKey={projectKey}
            linkedTasks={cards.filter((c) => c.storyId === selected.id)}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            Selecione ou crie uma história.
          </div>
        )}
      </div>
    </div>
  );
}

function StoryEditor({
  story,
  projectKey,
  linkedTasks,
  onDeleted,
}: {
  story: StoryDTO;
  projectKey: string;
  linkedTasks: CardDTO[];
  onDeleted: () => void;
}) {
  const { mutate, refresh, members, setOpenCardId } = useKanban();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(story.title);
  const [description, setDescription] = useState(story.description ?? "");
  const [status, setStatus] = useState<StatusCategory>(story.status);
  const [assignedTo, setAssignedTo] = useState(story.assignedTo ?? "");
  const [dueDate, setDueDate] = useState(toDateInput(story.dueDate));
  const [priority, setPriority] = useState<Priority>(story.priority);
  const [color, setColor] = useState<string | null>(story.color);

  // Mantém o formulário em sincronia se a story for atualizada por fora (refresh).
  useEffect(() => {
    setTitle(story.title);
    setDescription(story.description ?? "");
    setStatus(story.status);
    setAssignedTo(story.assignedTo ?? "");
    setDueDate(toDateInput(story.dueDate));
    setPriority(story.priority);
    setColor(story.color);
  }, [story]);

  const save = () =>
    startTransition(async () => {
      const res = await mutate({
        type: "updateStory",
        storyId: story.id,
        title: title.trim() || story.title,
        description: description.trim() || null,
        status,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        color,
      });
      if (res.ok) await refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const res = await mutate({ type: "deleteStory", storyId: story.id });
      if (res.ok) {
        onDeleted();
        await refresh();
      }
    });

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 space-y-5 p-5">
        <div className="font-mono text-sm text-muted-foreground">
          {projectKey}-S{story.number}
        </div>

        <div className="space-y-2">
          <Label htmlFor="story-title">Título</Label>
          <Input id="story-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Suspense
            fallback={
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Carregando editor…
              </div>
            }
          >
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Descreva a história…"
            />
          </Suspense>
        </div>

        {/* Tarefas vinculadas */}
        <div className="space-y-2 border-t pt-4">
          <Label>Tarefas vinculadas ({linkedTasks.length})</Label>
          {linkedTasks.length > 0 ? (
            <ul className="space-y-1">
              {linkedTasks.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setOpenCardId(c.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {projectKey}-{c.number}
                    </span>
                    <span className="truncate">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma tarefa vinculada. Vincule pelo painel da tarefa (campo “História”).
            </p>
          )}
        </div>
      </div>

      {/* Detalhes */}
      <div className="w-64 shrink-0 space-y-4 overflow-y-auto border-l bg-muted/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Detalhes
        </div>

        <Field>
          <FieldLabel>Status</FieldLabel>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusCategory)}>
            <FieldControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FieldControl>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLOR[s] }}
                    />
                    {STATUS_LABEL[s]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Responsável</FieldLabel>
          <FieldControl>
            <Combobox
              value={assignedTo}
              onChange={setAssignedTo}
              placeholder="Sem responsável"
              searchPlaceholder="Buscar pessoa…"
              emptyText="Ninguém encontrado."
              options={members.map((m) => ({ value: m.id, label: m.name }))}
            />
          </FieldControl>
        </Field>

        <Field>
          <FieldLabel>Prazo</FieldLabel>
          <FieldControl>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </FieldControl>
        </Field>

        <Field>
          <FieldLabel>Prioridade</FieldLabel>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <FieldControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FieldControl>
            <SelectContent>
              {PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="space-y-2">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setColor(null)}
              className={cn(
                "h-6 w-6 rounded-full border text-xs",
                color === null && "ring-2 ring-ring",
              )}
              title="Sem cor"
            >
              —
            </button>
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={cn("h-6 w-6 rounded-full border", color === c && "ring-2 ring-ring")}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="destructive" size="sm" disabled={pending} onClick={remove}>
            <Trash2 /> Excluir
          </Button>
          <Button size="sm" disabled={pending} onClick={save}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
