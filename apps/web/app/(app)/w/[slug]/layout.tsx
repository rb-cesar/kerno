import { notFound } from "next/navigation";
import type { WorkspaceView } from "@kerno/core/workspaces";
import { requireUser } from "@/lib/auth-helpers";
import { container } from "@/server/container";
import { SocketProvider } from "@/components/providers/socket-provider";
import { WorkspaceDockProvider } from "@/components/providers/workspace-dock-provider";
import { HubRail } from "@/components/app/hub-rail";
import { WorkspaceHeader } from "@/components/app/workspace-header";

export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const user = await requireUser();

  // Gate de acesso + dados do workspace — direto no service (mesmo processo),
  // sem HTTP. 404 se não for membro.
  const workspace: WorkspaceView | null = await container.workspaces
    .getBySlug(user.id, slug)
    .catch(() => null);
  if (!workspace) notFound();

  const isManager = workspace.myRole === "ADMIN";

  return (
    <SocketProvider workspaceId={workspace.id}>
      <div className="flex h-screen overflow-hidden">
        <HubRail
          basePath={`/w/${slug}`}
          userName={user.name ?? "Usuário"}
          userEmail={user.email ?? ""}
        />
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
    </SocketProvider>
  );
}
