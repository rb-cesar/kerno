import type { WorkspaceView } from "@kerno/core/workspaces";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { container } from "@/server/container";
import { BoardsClient } from "./boards-client";

export default async function BoardsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();

  // Resolve o workspace pelo slug e carrega o board direto no service (mesmo
  // processo). A permissão de membro é checada lá dentro.
  const workspace: WorkspaceView | null = await container.workspaces
    .getBySlug(user.id, slug)
    .catch(() => null);
  if (!workspace) notFound();

  const board = await container.kanban.boardForWorkspace(user.id, workspace.id).catch(() => null);
  if (!board) notFound();

  return <BoardsClient initial={board} currentUserId={user.id} />;
}
