import { notFound } from "next/navigation";
import type { BoardData } from "@kerno/kanban/types";
import type { WorkspaceView } from "@kerno/contracts/workspaces";
import { requireUser } from "@/lib/auth-helpers";
import { apiFetch } from "@/lib/api-client";
import { KanbanClient } from "./kanban-client";

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  // Resolve o workspace pelo slug e carrega o board via API (BFF). A permissão
  // de membro é checada no backend.
  const workspace = await apiFetch<WorkspaceView>(`/workspaces/${slug}`).catch(() => null);
  if (!workspace) notFound();

  const board = await apiFetch<BoardData>(
    `/kanban/workspaces/${workspace.id}/board`,
  ).catch(() => null);
  if (!board) notFound();

  return <KanbanClient initial={board} currentUserId={user.id} />;
}
