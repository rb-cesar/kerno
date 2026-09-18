import { Toaster } from "sonner";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { AppTopbar } from "@/components/shell/app-topbar";
import { requireSession } from "@/core/auth/require-session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();

  return (
    <SocketProvider>
      <NotificationsProvider>
        <div className="flex min-h-screen flex-col">
          <AppTopbar name={user.name ?? "Usuário"} email={user.email ?? ""} />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster position="bottom-right" />
      </NotificationsProvider>
    </SocketProvider>
  );
}
