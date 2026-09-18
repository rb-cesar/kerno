import { AppTopbar } from "@/components/shell/app-topbar";
import { requireSession } from "@/core/auth/require-session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();

  return (
    <div className="flex min-h-screen flex-col">
      <AppTopbar name={user.name ?? "Usuário"} email={user.email ?? ""} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
