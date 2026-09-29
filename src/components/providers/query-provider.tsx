"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { QueryResource } from "@/core/query";

/**
 * Monta no root (`src/app/layout.tsx`), fora do `ThemeProvider` — cobre tanto
 * `(auth)` quanto `(app)` e nunca remonta na troca entre os dois grupos de rota.
 * `useState(() => ...)` (lazy initializer, não `useMemo`) é exigência documentada
 * do React Query pra garantir que o client não é recriado em re-renders.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => QueryResource.getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
