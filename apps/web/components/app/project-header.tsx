"use client";

import Link from "next/link";
import { cn } from "@kerno/ui";
import { useSocket } from "@/components/providers/socket-provider";
import { ProjectMembersDialog } from "@/components/app/project-members-dialog";

type ProjectMember = { id: string; name: string; role: string };
type WorkspaceMember = { id: string; name: string };

export function ProjectHeader({
  projectName,
  workspaceHref,
  projectId,
  slug,
  isManager,
  projectMembers,
  workspaceMembers,
}: {
  projectName: string;
  workspaceHref: string;
  projectId: string;
  slug: string;
  isManager: boolean;
  projectMembers: ProjectMember[];
  workspaceMembers: WorkspaceMember[];
}) {
  const { connected, onlineUserIds } = useSocket();

  const online = projectMembers.filter((m) => onlineUserIds.includes(m.id));

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
      <div className="flex items-center gap-3">
        <Link
          href={workspaceHref}
          title="Voltar ao workspace"
          className="text-sm text-muted-foreground hover:underline"
        >
          ←
        </Link>
        <h1 className="font-semibold">{projectName}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              connected ? "bg-emerald-500" : "bg-neutral-500",
            )}
            title={connected ? "Conectado" : "Desconectado"}
          />
          {online.length > 0 ? `${online.length} online` : connected ? "Só você" : "Conectando…"}
        </div>
        <ProjectMembersDialog
          projectId={projectId}
          slug={slug}
          isManager={isManager}
          projectMembers={projectMembers}
          workspaceMembers={workspaceMembers}
        />
      </div>
    </header>
  );
}
