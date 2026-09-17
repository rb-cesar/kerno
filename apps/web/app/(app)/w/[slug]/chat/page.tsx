import type { WorkspaceView } from "@kerno/core/workspaces";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { container } from "@/server/container";
import { ChatClient } from "./chat-client";

export default async function ChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();

  // Resolve o workspace pelo slug e carrega o chat direto no service (mesmo
  // processo). Permissão de membro checada lá dentro.
  const workspace: WorkspaceView | null = await container.workspaces
    .getBySlug(user.id, slug)
    .catch(() => null);
  if (!workspace) notFound();

  const initial = await container.chat.chatForWorkspace(user.id, workspace.id).catch(() => null);
  if (!initial) notFound();

  return <ChatClient initial={initial} currentUserId={user.id} />;
}
