import Link from "next/link";
import type { WorkspaceListItem } from "@kerno/contracts/workspaces";
import { Card, CardDescription, CardHeader, CardTitle } from "@kerno/ui";
import { requireUser } from "@/lib/auth-helpers";
import { apiFetch } from "@/lib/api-client";
import { CreateWorkspaceForm } from "./create-workspace-form";

export default async function WorkspacesPage() {
  await requireUser();

  const workspaces = await apiFetch<WorkspaceListItem[]>("/workspaces").catch(() => []);

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
                    <CardDescription>{ws.memberCount} membro(s)</CardDescription>
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
