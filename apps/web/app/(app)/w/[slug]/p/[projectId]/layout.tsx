import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getProjectMembership } from "@/lib/permissions";
import { getProjectWithMembers } from "@/server/project-service";
import { SocketProvider } from "@/components/providers/socket-provider";
import { HubRail } from "@/components/app/hub-rail";
import { ProjectHeader } from "@/components/app/project-header";

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string; projectId: string }>;
  children: React.ReactNode;
}) {
  const { slug, projectId } = await params;
  const user = await requireUser();

  const membership = await getProjectMembership(user.id, projectId);
  if (!membership) notFound();

  const project = await getProjectWithMembers(projectId, user.id);
  if (!project) notFound();

  const { projectMembers, workspaceMembers } = project;
  const isManager = project.myWorkspaceRole === "ADMIN" || membership.role === "LEAD";

  return (
    <SocketProvider projectId={projectId} userId={user.id}>
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
