import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { UserMenu } from "@/components/app/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <Link href="/app" className="text-lg font-bold tracking-tight">
          Kerno
        </Link>
        <UserMenu name={user.name ?? "Usuário"} email={user.email ?? ""} />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
