"use client";

import { useState, useTransition } from "react";
import { Plus, Users, X } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kerno/ui";
import { addProjectMember, removeProjectMember } from "@/lib/project-members-actions";

type ProjectMember = { id: string; name: string; role: string };
type WorkspaceMember = { id: string; name: string };
type Result = { ok: true } | { ok: false; error: string };

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProjectMembersDialog({
  projectId,
  slug,
  isManager,
  projectMembers,
  workspaceMembers,
}: {
  projectId: string;
  slug: string;
  isManager: boolean;
  projectMembers: ProjectMember[];
  workspaceMembers: WorkspaceMember[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const inProject = new Set(projectMembers.map((m) => m.id));
  const candidates = workspaceMembers.filter((m) => !inProject.has(m.id));

  const run = (action: () => Promise<Result>) =>
    startTransition(async () => {
      setError(null);
      const res = await action();
      if (!res.ok) setError(res.error);
    });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users /> Membros
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Membros do projeto</DialogTitle>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <ul className="space-y-2">
          {projectMembers.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.role.toLowerCase()}</div>
              </div>
              {isManager ? (
                <button
                  disabled={pending}
                  onClick={() => run(() => removeProjectMember({ projectId, slug, userId: m.id }))}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  title="Remover do projeto"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {isManager ? (
          <div className="space-y-2 border-t pt-3">
            <div className="text-sm font-medium text-muted-foreground">Adicionar do workspace</div>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todos os membros do workspace já estão no projeto.
              </p>
            ) : (
              <ul className="space-y-2">
                {candidates.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => run(() => addProjectMember({ projectId, slug, userId: m.id }))}
                    >
                      <Plus /> Adicionar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Apenas admin do workspace ou lead do projeto podem gerenciar membros.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
