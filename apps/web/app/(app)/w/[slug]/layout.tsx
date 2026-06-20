import { notFound } from "next/navigation";
import type { WorkspaceView } from "@kerno/contracts/workspaces";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { apiFetch } from "@/lib/api-client";
import { SocketProvider } from "@/components/providers/socket-provider";
import { HubRail } from "@/components/app/hub-rail";
import { WorkspaceHeader } from "@/components/app/workspace-header";

// Origem da API (sem o sufixo /api) onde o Socket.io escuta.
const SOCKET_URL = (process.env.API_URL ?? "http://localhost:3333/api").replace(/\/api\/?$/, "");

export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const session = await auth();

  // Gate de acesso + dados do workspace via API (BFF). 404 se não for membro.
  const workspace = await apiFetch<WorkspaceView>(`/workspaces/${slug}`).catch(() => null);
  if (!workspace) notFound();

  const isManager = workspace.myRole === "ADMIN";

  return (
    <SocketProvider workspaceId={workspace.id} url={SOCKET_URL} token={session?.apiToken ?? null}>
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
          <div className="flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </SocketProvider>
  );
}
