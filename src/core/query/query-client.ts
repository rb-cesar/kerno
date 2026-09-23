import { QueryClient } from "@tanstack/react-query";

/**
 * Configuração default do QueryClient — num lugar só, usada tanto pela
 * instância por-request do servidor quanto pelo singleton do browser (ver
 * get-query-client.ts).
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
      },
    },
  });
}
