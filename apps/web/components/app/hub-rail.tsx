"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageSquare, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@kerno/ui";
import { UserMenu } from "@/components/app/user-menu";

type Hub = { key: string; label: string; icon: LucideIcon };

const HUBS: Hub[] = [
  { key: "kanban", label: "Kanban", icon: LayoutGrid },
  { key: "chat", label: "Chat", icon: MessageSquare },
];

/**
 * Barra fixa de hubs (estilo Discord): logo no topo, hubs do projeto no meio,
 * usuário no rodapé. Só ícones — o rótulo aparece como tooltip no hover.
 */
export function HubRail({
  basePath,
  userName,
  userEmail,
}: {
  basePath: string;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center border-r bg-muted/30 py-3">
      <Link
        href="/app"
        title="Kerno — meus workspaces"
        aria-label="Kerno — meus workspaces"
        className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground"
      >
        K
      </Link>

      <div className="my-3 h-px w-8 bg-border" />

      <div className="flex flex-1 flex-col items-center gap-2">
        {HUBS.map((hub) => {
          const href = `${basePath}/${hub.key}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = hub.icon;
          return (
            <div key={hub.key} className="relative flex w-full justify-center">
              {active ? (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              ) : null}
              <Link
                href={href}
                title={hub.label}
                aria-label={hub.label}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            </div>
          );
        })}

        <button
          type="button"
          disabled
          title="Mais hubs em breve"
          aria-label="Adicionar hub (em breve)"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed text-muted-foreground/60"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <UserMenu name={userName} email={userEmail} side="right" align="end" />
    </nav>
  );
}
