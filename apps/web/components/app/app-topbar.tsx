"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/app/user-menu";

/**
 * Header global (logo + usuário) da lista de workspaces (/app).
 * Dentro de um workspace (rota /w/<slug>/...) ele some: lá o HubRail
 * full-height assume a logo no topo e o usuário no rodapé.
 */
export function AppTopbar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  if (/^\/w\//.test(pathname)) return null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-header-border bg-header px-4 text-header-foreground">
      <Link href="/app" className="text-lg font-bold tracking-tight">
        Kerno
      </Link>
      <UserMenu name={name} email={email} />
    </header>
  );
}
