import { notFound } from "next/navigation";
import type { ProjectView } from "@kerno/contracts/workspaces";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { apiFetch } from "@/lib/api-client";
import { SocketProvider } from "@/components/providers/socket-provider";
import { HubRail } from "@/components/app/hub-rail";
import { ProjectHeader } from "@/components/app/project-header";

// Origem da API (sem o sufixo /api) onde o Socket.io escuta.
const SOCKET_URL = (process.env.API_URL ?? "http://localhost:3333/api").replace(/\/api\/?$/, "");

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string; projectId: string }>;
  children: React.ReactNode;
}) {
  const { slug, projectId } = await params;
  const user = await requireUser();
  const session = await auth();

  // Gate de acesso + dados do projeto via API (BFF). 404 se não for membro.
  const project = await apiFetch<ProjectView>(`/projects/${projectId}/view`).catch(() => null);
  if (!project) notFound();

  const { projectMembers, workspaceMembers } = project;
  const isManager = project.myWorkspaceRole === "ADMIN" || project.myProjectRole === "LEAD";

  return (
    <SocketProvider projectId={projectId} url={SOCKET_URL} token={session?.apiToken ?? null}>
      <div className="flex h-screen overflow-hidden">
        <HubRail
          basePath={`/w/${slug}/p/${projectId}`}
          userName={user.name ?? "Usuário"}
          userEmail={user.email ?? ""}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <ProjectHeader
            projectName={project.name}
            workspaceHref={`/w/${slug}`}
            projectId={projectId}
            slug={slug}
            isManager={isManager}
            projectMembers={projectMembers}
            workspaceMembers={workspaceMembers}
          />
          <div className="flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </SocketProvider>
  );
}
