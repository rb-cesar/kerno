import { notFound } from "next/navigation";
import { WorkspacePresenceProvider } from "@/components/providers/workspace-presence-provider";
import { HubRail } from "@/components/shell/hub-rail";
import { WorkspaceDockProvider } from "@/components/shell/workspace-dock-provider";
import { requireSession } from "@/core/auth/require-session";
import { CallsProvider } from "@/modules/calls/components/calls-provider";
import { WorkspaceHeader } from "@/modules/workspaces/components/workspace-header";
import type { WorkspaceView } from "@/modules/workspaces/types";
import { container } from "@/server/container";

export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const user = await requireSession();

  // Gate de acesso + dados do workspace — direto no service (mesmo processo),
  // sem HTTP. 404 se não for membro.
  const workspace: WorkspaceView | null = await container.workspaces.getBySlug(user.id, slug).catch(() => null);
  if (!workspace) notFound();

  const isManager = workspace.myRole === "ADMIN";

  return (
    <WorkspacePresenceProvider workspaceId={workspace.id}>
      <CallsProvider
        workspaceId={workspace.id}
        currentUserId={user.id}
        currentUserName={user.name ?? "Usuário"}
        slug={slug}
      >
        <div className="flex h-screen overflow-hidden">
          <HubRail basePath={`/w/${slug}`} userName={user.name ?? "Usuário"} userEmail={user.email ?? ""} />
          <div className="flex min-w-0 flex-1 flex-col">
            <WorkspaceHeader
              workspaceName={workspace.name}
              workspaceId={workspace.id}
              slug={slug}
              isManager={isManager}
              members={workspace.members}
            />
            <div className="flex-1 overflow-hidden">
              <WorkspaceDockProvider currentUserId={user.id}>{children}</WorkspaceDockProvider>
            </div>
          </div>
        </div>
      </CallsProvider>
    </WorkspacePresenceProvider>
  );
}
