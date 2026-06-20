"use client";

import { Suspense, lazy, useCallback, useEffect, useState, useTransition } from "react";
import { Clock, MessageSquare, Plus, Trash2, X } from "lucide-react";
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
  Skeleton,
  cn,
} from "@kerno/ui";
import type { CardDetailDTO, CardDTO, Priority } from "../types";

// Lazy: o editor Lexical (+prism) sÃ³ baixa quando um card Ã© aberto, mantendo o
// bundle inicial da rota /kanban enxuto.
const RichTextEditor = lazy(() =>
  import("@kerno/editor").then((m) => ({ default: m.RichTextEditor })),
);
const RichTextView = lazy(() => import("@kerno/editor").then((m) => ({ default: m.RichTextView })));
import { CardChecklists } from "./card-checklists";
import { useKanban } from "./kanban-context";
import {
  CATEGORY_COLOR,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  activityText,
  formatStamp,
  toDateInput,
} from "./meta";

/**
 * Shell do painel de detalhe do card. NÃƒO Ã© modal: abre como coluna lateral Ã 
 * direita, dentro da prÃ³pria tela do board (que encolhe e permanece interativo).
 * O shell monta UMA vez ao abrir (animaÃ§Ã£o slide-in); ao trocar de tarefa ele
 * permanece montado e sÃ³ o conteÃºdo interno (`CardContent`, com `key={card.id}`)
 * Ã© recriado â€” disparando a transiÃ§Ã£o skeleton/fade-in em vez de outro slide.
 */
export function CardDialog({ card, onClose }: { card: CardDTO; onClose: () => void }) {
  return (
    <aside
      className={cn(
        "flex h-full w-[44rem] min-w-[28rem] max-w-[60vw] shrink-0 flex-col border-l bg-background",
        "duration-300 animate-in slide-in-from-right",
      )}
    >
      <CardContent key={card.id} card={card} onClose={onClose} />
    </aside>
  );
}

/** Esqueleto exibido enquanto o detalhe do card carrega (e na troca de tarefa). */
function CardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden duration-200 animate-in fade-in">
      <div className="min-w-0 flex-1 space-y-5 p-5">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="w-64 shrink-0 space-y-4 border-l bg-muted/20 p-4">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CardContent({ card, onClose }: { card: CardDTO; onClose: () => void }) {
  const { mutate, refresh, members, labels, cycles, stories, workspaceKey, fetchCardDetail, remoteRev } =
    useKanban();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [assignedTo, setAssignedTo] = useState(card.assignedTo ?? "");
  const [labelIds, setLabelIds] = useState<string[]>(card.labels.map((l) => l.id));
  const [priority, setPriority] = useState<Priority>(card.priority);
  const [dueDate, setDueDate] = useState<string>(toDateInput(card.dueDate));
  const [estimate, setEstimate] = useState<string>(card.estimate?.toString() ?? "");
  const [cycleId, setCycleId] = useState<string>(card.cycleId ?? "");
  const [storyId, setStoryId] = useState<string>(card.storyId ?? "");

  const [detail, setDetail] = useState<CardDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentKey, setCommentKey] = useState(0);

  const loadDetail = useCallback(async () => {
    const d = await fetchCardDetail(card.id);
    setDetail(d);
  }, [fetchCardDetail, card.id]);

  // Carga inicial do detalhe (controla o estado de skeleton da primeira pintura).
  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchCardDetail(card.id).then((d) => {
      if (!active) return;
      setDetail(d);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchCardDetail, card.id]);

  // MudanÃ§a remota (outro usuÃ¡rio): recarrega o detalhe sem o skeleton, mantendo
  // checklists/comentÃ¡rios/atividade em dia enquanto o painel estÃ¡ aberto.
  useEffect(() => {
    if (remoteRev === 0) return;
    void loadDetail();
  }, [remoteRev, loadDetail]);

  // Esc fecha o painel (sem prender o foco como um modal faria).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleLabel = (id: string) =>
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = () =>
    startTransition(async () => {
      const estimateNum = estimate.trim() === "" ? null : Number.parseInt(estimate, 10);
      const res = await mutate({
        type: "updateCard",
        cardId: card.id,
        title: title.trim() || card.title,
        description: description.trim() || null,
        assignedTo: assignedTo || null,
        labelIds,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        estimate: estimateNum != null && Number.isFinite(estimateNum) ? estimateNum : null,
        cycleId: cycleId || null,
        storyId: storyId || null,
      });
      if (res.ok) {
        await refresh();
        onClose();
      }
    });

  const handleDelete = () =>
    startTransition(async () => {
      const res = await mutate({ type: "deleteCard", cardId: card.id });
      if (res.ok) {
        await refresh();
        onClose();
      }
    });

  const addSubtask = () => {
    const value = newSubtask.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await mutate({ type: "createSubtask", parentId: card.id, title: value });
      if (res.ok) {
        setNewSubtask("");
        await Promise.all([loadDetail(), refresh()]);
      }
    });
  };

  const addComment = () => {
    const value = newComment.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await mutate({ type: "addComment", cardId: card.id, body: value });
      if (res.ok) {
        setNewComment("");
        setCommentKey((k) => k + 1);
        await loadDetail();
      }
    });
  };

  const removeComment = (commentId: string) =>
    startTransition(async () => {
      const res = await mutate({ type: "deleteComment", commentId });
      if (res.ok) await loadDetail();
    });

  const cardKey = `${workspaceKey}-${card.number}`;
  const children = detail?.children ?? [];
  const doneChildren = children.filter((c) => c.done).length;

  return (
    <>
      {/* CabeÃ§alho */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <span className="font-mono text-sm text-muted-foreground">{cardKey}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Fechar (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : (
        <Suspense fallback={<CardSkeleton />}>
          <div className="flex min-h-0 flex-1 overflow-hidden duration-200 animate-in fade-in">
            {/* â”€â”€ Coluna principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="min-w-0 flex-1 space-y-5 overflow-y-auto p-5">
              <div className="space-y-2">
                <Label htmlFor="card-title">TÃ­tulo</Label>
                <Input id="card-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>DescriÃ§Ã£o</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Descreva a tarefaâ€¦"
                />
              </div>

              {/* Sub-tarefas */}
              <div className="space-y-2 border-t pt-4">
                <Label>
                  Sub-tarefas{" "}
                  {children.length > 0 ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {doneChildren}/{children.length}
                    </span>
                  ) : null}
                </Label>
                {children.length > 0 ? (
                  <ul className="space-y-1">
                    {children.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLOR[c.category] }}
                        />
                        <span className="font-mono text-xs text-muted-foreground">
                          {workspaceKey}-{c.number}
                        </span>
                        <span
                          className={cn("truncate", c.done && "text-muted-foreground line-through")}
                        >
                          {c.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex gap-2">
                  <Input
                    value={newSubtask}
                    placeholder="Nova sub-tarefa"
                    disabled={pending}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                  />
                  <Button variant="outline" size="icon" disabled={pending} onClick={addSubtask}>
                    <Plus />
                  </Button>
                </div>
              </div>

              {/* Checklists (todolists) */}
              <CardChecklists
                checklists={detail?.checklists ?? []}
                cardId={card.id}
                mutate={mutate}
                reload={loadDetail}
              />

              {/* ComentÃ¡rios */}
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> ComentÃ¡rios
                </Label>
                {detail?.comments.length ? (
                  <ul className="space-y-2">
                    {detail.comments.map((c) => (
                      <li key={c.id} className="rounded-md bg-muted/50 p-2 text-sm">
                        <div className="mb-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {c.author?.name ?? "Desconhecido"}
                          </span>
                          <span>{formatStamp(c.createdAt)}</span>
                          {c.mine ? (
                            <button
                              type="button"
                              onClick={() => removeComment(c.id)}
                              disabled={pending}
                              className="ml-auto hover:text-destructive"
                              title="Excluir comentÃ¡rio"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                        <RichTextView content={c.body} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum comentÃ¡rio ainda.</p>
                )}
                <RichTextEditor
                  key={commentKey}
                  value=""
                  onChange={setNewComment}
                  placeholder="Escreva um comentÃ¡rioâ€¦"
                  minHeightClass="min-h-[3rem]"
                />
                <div className="flex justify-end">
                  <Button variant="outline" disabled={pending} onClick={addComment}>
                    Comentar
                  </Button>
                </div>
              </div>

              {/* Atividade */}
              {detail?.activity.length ? (
                <div className="space-y-2 border-t pt-4">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Atividade
                  </Label>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {detail.activity.map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLOR[a.category] }}
                        />
                        <span className="flex-1">{activityText(a)}</span>
                        <span>{formatStamp(a.at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* â”€â”€ Barra de detalhes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="w-64 shrink-0 space-y-4 overflow-y-auto border-l bg-muted/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Detalhes
              </div>

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

              <Field>
                <FieldLabel>ResponsÃ¡vel</FieldLabel>
                <FieldControl>
                  <Combobox
                    value={assignedTo}
                    onChange={setAssignedTo}
                    placeholder="Sem responsÃ¡vel"
                    searchPlaceholder="Buscar pessoaâ€¦"
                    emptyText="NinguÃ©m encontrado."
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
                <FieldLabel>Estimativa (pts)</FieldLabel>
                <FieldControl>
                  <Input
                    type="number"
                    min={0}
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value)}
                  />
                </FieldControl>
              </Field>

              {cycles.length > 0 ? (
                <Field>
                  <FieldLabel>Cycle / Sprint</FieldLabel>
                  <FieldControl>
                    <Combobox
                      value={cycleId}
                      onChange={setCycleId}
                      placeholder="Sem cycle"
                      searchPlaceholder="Buscar cycleâ€¦"
                      emptyText="Nenhum cycle."
                      options={cycles.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </FieldControl>
                </Field>
              ) : null}

              {stories.length > 0 ? (
                <Field>
                  <FieldLabel>HistÃ³ria</FieldLabel>
                  <FieldControl>
                    <Combobox
                      value={storyId}
                      onChange={setStoryId}
                      placeholder="Sem histÃ³ria"
                      searchPlaceholder="Buscar histÃ³riaâ€¦"
                      emptyText="Nenhuma histÃ³ria."
                      options={stories.map((s) => ({
                        value: s.id,
                        label: `${workspaceKey}-S${s.number} Â· ${s.title}`,
                      }))}
                    />
                  </FieldControl>
                </Field>
              ) : null}

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
                          style={active ? { backgroundColor: l.color, color: "#fff" } : undefined}
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
          </div>
        </Suspense>
      )}

      {/* RodapÃ© */}
      <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
        <Button variant="destructive" onClick={handleDelete} disabled={pending}>
          Excluir
        </Button>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Salvandoâ€¦" : "Salvar"}
        </Button>
      </div>
    </>
  );
}
