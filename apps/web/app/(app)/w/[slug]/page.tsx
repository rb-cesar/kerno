import Link from "next/link";
import { notFound } from "next/navigation";
import type { WorkspaceDetail } from "@kerno/contracts/workspaces";
import {
  Avatar,
  AvatarFallback,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kerno/ui";
import { requireUser } from "@/lib/auth-helpers";
import { apiFetch } from "@/lib/api-client";
import { CreateProjectForm } from "./create-project-form";
import { InviteMemberForm } from "./invite-member-form";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireUser();

  const workspace = await apiFetch<WorkspaceDetail>(`/workspaces/${slug}`).catch(() => null);
  if (!workspace) notFound();

  const isAdmin = workspace.myRole === "ADMIN";

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
          {workspace.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum projeto ainda. Crie o primeiro.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {workspace.projects.map((project) => (
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
            {workspace.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.role.toLowerCase()}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {isAdmin ? (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Convidar membro</h3>
              <InviteMemberForm workspaceId={workspace.id} slug={slug} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
