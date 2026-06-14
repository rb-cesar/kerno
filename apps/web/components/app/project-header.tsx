"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@kerno/ui";
import { useSocket } from "@/components/providers/socket-provider";

type Member = { id: string; name: string };

const HUBS = [
  { key: "kanban", label: "Kanban" },
  { key: "chat", label: "Chat" },
] as const;

export function ProjectHeader({
  projectName,
  basePath,
  workspaceHref,
  members,
}: {
  projectName: string;
  basePath: string;
  workspaceHref: string;
  members: Member[];
}) {
  const pathname = usePathname();
  const { connected, onlineUserIds } = useSocket();

  const online = members.filter((m) => onlineUserIds.includes(m.id));

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Link href={workspaceHref} className="text-sm text-muted-foreground hover:underline">
          ←
        </Link>
        <h1 className="font-semibold">{projectName}</h1>
        <nav className="flex items-center gap-1">
          {HUBS.map((hub) => {
            const href = `${basePath}/${hub.key}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={hub.key}
                href={href}
                className={cn(
                  "rounded-md px-3 py-1 text-sm transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {hub.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            connected ? "bg-emerald-500" : "bg-neutral-500",
          )}
          title={connected ? "Conectado" : "Desconectado"}
        />
        {online.length > 0
          ? `${online.length} online`
          : connected
            ? "Só você"
            : "Conectando…"}
      </div>
    </header>
  );
}
