import { notFound } from "next/navigation";
import type { ChatData } from "@kerno/chat/types";
import type { WorkspaceView } from "@kerno/contracts/workspaces";
import { requireUser } from "@/lib/auth-helpers";
import { apiFetch } from "@/lib/api-client";
import { ChatClient } from "./chat-client";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  // Resolve o workspace pelo slug e carrega o chat via API (BFF). Permissão de
  // membro checada no backend.
  const workspace = await apiFetch<WorkspaceView>(`/workspaces/${slug}`).catch(() => null);
  if (!workspace) notFound();

  const initial = await apiFetch<ChatData>(`/chat/workspaces/${workspace.id}`).catch(() => null);
  if (!initial) notFound();

  return <ChatClient initial={initial} currentUserId={user.id} />;
}
