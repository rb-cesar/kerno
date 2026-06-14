import Link from "next/link";
import { prisma } from "@kerno/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@kerno/ui";
import { requireUser } from "@/lib/auth-helpers";
import { CreateWorkspaceForm } from "./create-workspace-form";

export default async function WorkspacesPage() {
  const user = await requireUser();

  const workspaces = await prisma.workspace.findMany({
    where: { users: { some: { userId: user.id } } },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-10 p-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Seus workspaces</h1>

        {workspaces.length === 0 ? (
          <p className="text-muted-foreground">
            Você ainda não participa de nenhum workspace. Crie o primeiro abaixo.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/w/${ws.slug}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle>{ws.name}</CardTitle>
                    <CardDescription>
                      {ws._count.projects} projeto(s)
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Novo workspace</h2>
        <CreateWorkspaceForm />
      </section>
    </div>
  );
}
