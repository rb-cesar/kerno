import { notFound } from "next/navigation";
import type { BoardData } from "@kerno/kanban/types";
import { requireUser } from "@/lib/auth-helpers";
import { apiFetch } from "@/lib/api-client";
import { KanbanClient } from "./kanban-client";

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();

  // Carga inicial via API (BFF). A permissão de membro é checada no backend.
  const board = await apiFetch<BoardData>(`/kanban/projects/${projectId}/board`).catch(
    () => null,
  );
  if (!board) notFound();

  return <KanbanClient initial={board} currentUserId={user.id} />;
}
