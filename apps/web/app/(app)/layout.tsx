import { AppTopbar } from "@/components/app/app-topbar";
import { requireUser } from "@/lib/auth-helpers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <AppTopbar name={user.name ?? "Usuário"} email={user.email ?? ""} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
