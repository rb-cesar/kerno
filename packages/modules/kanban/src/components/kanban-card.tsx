"use client";

import { type HTMLAttributes } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { BookMarked, CalendarClock } from "lucide-react";
import { Badge, Tooltip, TooltipContent, TooltipTrigger, cn } from "@kerno/ui";
import type { CardDTO } from "../types";
import { useKanban } from "./kanban-context";
import { PRIORITY_META, formatDue, initials, isOverdue } from "./meta";

/** Tile do card no board. O detalhe/edição vive no CardDialog (singleton do board). */
export function KanbanCard({
  card,
  index,
  dragDisabled = false,
}: {
  card: CardDTO;
  index: number;
  dragDisabled?: boolean;
}) {
  const { workspaceKey, setOpenCardId } = useKanban();

  const cardKey = `${workspaceKey}-${card.number}`;
  const prio = card.priority !== "NONE" ? PRIORITY_META[card.priority] : null;
  const overdue = card.dueDate ? isOverdue(card.dueDate) : false;

  return (
    <Draggable draggableId={card.id} index={index} isDragDisabled={dragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...(provided.draggableProps as HTMLAttributes<HTMLDivElement>)}
          {...provided.dragHandleProps}
          role="button"
          tabIndex={0}
          onClick={() => setOpenCardId(card.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setOpenCardId(card.id);
          }}
          className={cn(
            "cursor-pointer rounded-md border bg-card p-3 text-sm shadow-sm transition-colors hover:border-foreground/30",
            snapshot.isDragging && "ring-2 ring-ring",
          )}
        >
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            {prio ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: prio.color }}
                title={`Prioridade: ${prio.label}`}
              />
            ) : null}
            <span className="font-mono">{cardKey}</span>
            {card.storyId ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 text-primary" aria-label="História vinculada">
                    <BookMarked className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{card.storyTitle ?? "História"}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          {card.labels.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {card.labels.map((l) => (
                <Badge key={l.id} style={{ backgroundColor: l.color, color: "#fff" }}>
                  {l.name}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="font-medium">{card.title}</div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {card.assignee ? (
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                  {initials(card.assignee.name)}
                </span>
                {card.assignee.name}
              </span>
            ) : null}
            {card.dueDate ? (
              <span
                className={cn("flex items-center gap-1", overdue && "text-destructive")}
                title={overdue ? "Atrasado" : "Prazo"}
              >
                <CalendarClock className="h-3 w-3" />
                {formatDue(card.dueDate)}
              </span>
            ) : null}
            {card.estimate != null ? (
              <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{card.estimate} pt</span>
            ) : null}
          </div>
        </div>
      )}
    </Draggable>
  );
}
