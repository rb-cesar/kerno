"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { DEFAULT_THEME, THEME_IDS } from "@/lib/themes";

/**
 * Provider de temas do Kerno (sobre o next-themes).
 *
 * - `attribute="class"`: o tema vira a classe aplicada no <html> (ex. `.midnight`),
 *   que ativa o bloco de CSS variables correspondente em globals.css.
 * - `themes={THEME_IDS}`: lista de temas válidos (derivada do catálogo).
 * - `enableSystem={false}`: o Kerno tem um padrão próprio (escuro); o usuário
 *   escolhe explicitamente. Trocar para `true` habilitaria "Sincronizar com o SO".
 * - O next-themes injeta um script que aplica o tema antes do paint (sem flash)
 *   e persiste a escolha no localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={DEFAULT_THEME}
      themes={THEME_IDS}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
