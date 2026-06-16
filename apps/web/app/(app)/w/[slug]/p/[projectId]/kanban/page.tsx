import { notFound } from "next/navigation";
import { prisma } from "@kerno/db";
import { getBoardSnapshot } from "@kerno/kanban/services";
import { requireUser } from "@/lib/auth-helpers";
import { assertProjectMember } from "@kerno/core/workspaces";
import { KanbanClient } from "./kanban-client";

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();
  await assertProjectMember(user.id, projectId);

  const board = await prisma.board.findFirst({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!board) notFound();

  const snapshot = await getBoardSnapshot(board.id);
  if (!snapshot) notFound();

  return <KanbanClient initial={snapshot} currentUserId={user.id} />;
}
