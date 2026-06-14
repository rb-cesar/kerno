import { notFound } from "next/navigation";
import { prisma } from "@kerno/db";
import { requireUser } from "@/lib/auth-helpers";
import { getProjectMembership } from "@/lib/permissions";
import { SocketProvider } from "@/components/providers/socket-provider";
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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      users: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!project) notFound();

  const members = project.users.map((m) => ({
    id: m.user.id,
    name: m.user.name,
  }));

  return (
    <SocketProvider projectId={projectId} userId={user.id}>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <ProjectHeader
          projectName={project.name}
          basePath={`/w/${slug}/p/${projectId}`}
          workspaceHref={`/w/${slug}`}
          members={members}
        />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </SocketProvider>
  );
}
