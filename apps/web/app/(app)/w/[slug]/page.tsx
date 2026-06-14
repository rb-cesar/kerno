import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@kerno/db";
import {
  Avatar,
  AvatarFallback,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kerno/ui";
import { requireUser } from "@/lib/auth-helpers";
import { CreateProjectForm } from "./create-project-form";
import { InviteMemberForm } from "./invite-member-form";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      users: { include: { user: true }, orderBy: { role: "asc" } },
    },
  });

  if (!workspace) notFound();

  const myMembership = workspace.users.find((m) => m.userId === user.id);
  if (!myMembership) notFound();

  const isAdmin = myMembership.role === "ADMIN";

  const projects = await prisma.project.findMany({
    where: {
      workspaceId: workspace.id,
      users: { some: { userId: user.id } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      <div className="space-y-1">
        <Link href="/app" className="text-sm text-muted-foreground hover:underline">
          ← Workspaces
        </Link>
        <h1 className="text-2xl font-bold">{workspace.name}</h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Projetos</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum projeto ainda. Crie o primeiro.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <Link key={project.id} href={`/w/${slug}/p/${project.id}`}>
                  <Card className="h-full transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle>{project.name}</CardTitle>
                      {project.description ? (
                        <CardDescription>{project.description}</CardDescription>
                      ) : null}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Novo projeto</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <CreateProjectForm workspaceId={workspace.id} slug={slug} />
            </div>
          </Card>
        </section>

        <aside className="space-y-4">
          <h2 className="text-lg font-semibold">Membros</h2>
          <ul className="space-y-2">
            {workspace.users.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {m.user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm">{m.user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.role.toLowerCase()}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {isAdmin ? (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Convidar membro
              </h3>
              <InviteMemberForm workspaceId={workspace.id} slug={slug} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
