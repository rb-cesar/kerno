import { isServer, type QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { makeQueryClient } from "./query-client";

// No servidor, cada request precisa da sua própria instância — `React.cache`
// memoiza por request (diferente de `globalThis` em server/container.ts, que
// é de propósito global e sobreviveria entre requests/usuários, vazando cache
// de um usuário pro outro). No browser, o inverso: precisa ser um singleton
// estável entre re-renders, não uma instância nova a cada chamada.
const getServerQueryClient = cache(makeQueryClient);
let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) return getServerQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
