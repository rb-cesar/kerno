"use client";

import Link from "next/link";
import { cn } from "@kerno/ui";
import { useSocket } from "@/components/providers/socket-provider";
import { WorkspaceMembersDialog } from "@/components/app/workspace-members-dialog";

type Member = { id: string; name: string; role: string };

export function WorkspaceHeader({
  workspaceName,
  workspaceId,
  slug,
  isManager,
  members,
}: {
  workspaceName: string;
  workspaceId: string;
  slug: string;
  isManager: boolean;
  members: Member[];
}) {
  const { connected, onlineUserIds } = useSocket();

  const online = members.filter((m) => onlineUserIds.includes(m.id));

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
      <div className="flex items-center gap-3">
        <Link
          href="/app"
          title="Voltar aos workspaces"
          className="text-sm text-muted-foreground hover:underline"
        >
          ←
        </Link>
        <h1 className="font-semibold">{workspaceName}</h1>
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
        <WorkspaceMembersDialog
          workspaceId={workspaceId}
          slug={slug}
          isManager={isManager}
          members={members}
        />
      </div>
    </header>
  );
}
