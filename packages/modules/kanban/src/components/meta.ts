// Metadados de apresentação compartilhados pelos componentes do card (tile,
// dialog, lista): cores/rótulos de prioridade e categoria + formatadores.

import type { CardActivityDTO, Priority, StatusCategory } from "../types";

export const PRIORITY_META: Record<Exclude<Priority, "NONE">, { label: string; color: string }> = {
  LOW: { label: "Baixa", color: "#64748b" },
  MEDIUM: { label: "Média", color: "#3b82f6" },
  HIGH: { label: "Alta", color: "#f59e0b" },
  URGENT: { label: "Urgente", color: "#ef4444" },
};
export const PRIORITY_ORDER: Priority[] = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];
export const PRIORITY_LABEL: Record<Priority, string> = {
  NONE: "Sem prioridade",
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const CATEGORY_COLOR: Record<StatusCategory, string> = {
  BACKLOG: "#94a3b8",
  UNSTARTED: "#64748b",
  STARTED: "#3b82f6",
  COMPLETED: "#22c55e",
  CANCELED: "#ef4444",
};

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function toDateInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

export function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isOverdue(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso) < today;
}

export function activityText(a: CardActivityDTO): string {
  const who = a.actorName ?? "Alguém";
  return a.initial ? `${who} criou em "${a.toColumnName}"` : `${who} moveu para "${a.toColumnName}"`;
}
