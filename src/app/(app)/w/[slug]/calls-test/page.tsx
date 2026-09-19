import { notFound } from "next/navigation";
import { requireSession } from "@/core/auth/require-session";
import type { WorkspaceView } from "@/modules/workspaces/types";
import { container } from "@/server/container";
import { CallsTestClient } from "./calls-test-client";

// Página isolada só pra validar a fundação de chamadas (Etapa 1 do plano) —
// sem integração com o chat ainda. Usa o 1º canal do workspace como alvo.
export default async function CallsTestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireSession();

  const workspace: WorkspaceView | null = await container.workspaces.getBySlug(user.id, slug).catch(() => null);
  if (!workspace) notFound();

  const chat = await container.chat.chatForWorkspace(user.id, workspace.id).catch(() => null);
  const channelId = chat?.initialChannelId ?? null;
  if (!channelId) notFound();

  return <CallsTestClient channelId={channelId} currentUserId={user.id} />;
}
