import { notFound } from "next/navigation";
import type { ChatData } from "@kerno/chat/types";
import { requireUser } from "@/lib/auth-helpers";
import { apiFetch } from "@/lib/api-client";
import { ChatClient } from "./chat-client";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();

  // Carga inicial via API (BFF). Permissão de membro checada no backend.
  const initial = await apiFetch<ChatData>(`/chat/projects/${projectId}`).catch(() => null);
  if (!initial) notFound();

  return <ChatClient initial={initial} currentUserId={user.id} />;
}
