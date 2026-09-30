import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { requireSession } from "@/core/auth/require-session";
import { QueryResource } from "@/core/query";
import { kanbanBoardResource } from "@/modules/kanban/queries";
import type { WorkspaceView } from "@/modules/workspaces/types";
import { container } from "@/server/container";
import { BoardsClient } from "./boards-client";

export default async function BoardsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireSession();

  // Resolve o workspace pelo slug e carrega o board direto no service (mesmo
  // processo). A permissão de membro é checada lá dentro.
  const workspace: WorkspaceView | null = await container.workspaces.getBySlug(user.id, slug).catch(() => null);
  if (!workspace) notFound();

  const board = await container.kanban.boardForWorkspace(user.id, workspace.id).catch(() => null);
  if (!board) notFound();

  // Semeia o cache do React Query com o resultado já obtido acima (não
  // rechama fetch) — o cliente hidrata a partir daqui em vez de um
  // `useState(initial)` que se perde ao desmontar a rota.
  const queryClient = QueryResource.getQueryClient();
  kanbanBoardResource.hydrate(queryClient, board, board.id);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BoardsClient initial={board} currentUserId={user.id} />
    </HydrationBoundary>
  );
}
