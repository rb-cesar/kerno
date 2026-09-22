import type { Metadata } from "next";
import "./globals.css";
import "@livekit/components-styles";
// Depois da lib de propósito: precisa vencer `[data-lk-theme=default]` na cascata.
import "@/modules/calls/components/livekit-theme.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

export const metadata: Metadata = {
  title: "Kerno",
  description: "Your dev environment, unified.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning: o next-themes ajusta a classe do <html> no cliente
  // antes do paint, divergindo do HTML do servidor — o warning é esperado e seguro.
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
