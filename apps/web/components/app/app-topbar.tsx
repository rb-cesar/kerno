"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/app/user-menu";

/**
 * Header global (logo + usuário) das telas de workspace/projeto.
 * Dentro de um projeto (rota .../p/<id>/...) ele some: lá o HubRail
 * full-height assume a logo no topo e o usuário no rodapé.
 */
export function AppTopbar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  if (/\/p\/[^/]+/.test(pathname)) return null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <Link href="/app" className="text-lg font-bold tracking-tight">
        Kerno
      </Link>
      <UserMenu name={name} email={email} />
    </header>
  );
}
