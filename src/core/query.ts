import { isServer, keepPreviousData, QueryClient, type QueryKey, useQuery } from "@tanstack/react-query";
import { cache } from "react";

/**
 * Abstração de queries do app — uma classe só: os métodos estáticos cuidam
 * do QueryClient compartilhado (uma instância só pra app inteiro); cada
 * instância descreve um recurso de valor único identificado por um id
 * (board, detalhe de card, métricas...), com chave e fetcher definidos uma
 * vez e reaproveitados por `useQuery` (cliente) e `hydrate` (Server
 * Component, pra semear o cache com um resultado que já veio de
 * `container.X`, sem rechamar `fetch`).
 *
 * Nota: `resource.useQuery(...)` (chamada por membro, não por identificador
 * `use...` solto) pode não ser reconhecida como hook por lint estático de
 * "rules of hooks" — uso indevido em condicional/loop não é pego
 * automaticamente.
 */
export class QueryResource<TData> {
  private static browserQueryClient: QueryClient | undefined;
  // React.cache = memoizado por REQUEST no servidor (diferente de globalThis
  // em server/container.ts, que é de propósito global e sobreviveria entre
  // requests/usuários, vazando cache de um usuário pro outro).
  private static getServerQueryClient = cache(QueryResource.makeQueryClient);

  private static makeQueryClient(): QueryClient {
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 },
      },
    });
  }

  /** No browser precisa ser um singleton estável entre re-renders, não uma instância nova a cada chamada. */
  static getQueryClient(): QueryClient {
    if (isServer) return QueryResource.getServerQueryClient();
    if (!QueryResource.browserQueryClient) QueryResource.browserQueryClient = QueryResource.makeQueryClient();
    return QueryResource.browserQueryClient;
  }

  constructor(
    private config: {
      baseKey: QueryKey;
      /** Fetcher do cliente (ex.: `kanbanClient.snapshot`) — nunca uma service call direta de servidor. */
      fetch: (id: string) => Promise<TData>;
      staleTime?: number;
      gcTime?: number;
      /** Ao trocar de id, mantém os dados antigos visíveis até os novos chegarem, em vez de piscar `undefined`. */
      keepPreviousData?: boolean;
    },
  ) {}

  key = (id: string): QueryKey => [...this.config.baseKey, id];

  useQuery = (id: string) =>
    useQuery({
      queryKey: this.key(id),
      queryFn: () => this.config.fetch(id),
      staleTime: this.config.staleTime,
      gcTime: this.config.gcTime,
      placeholderData: this.config.keepPreviousData ? keepPreviousData : undefined,
    });

  /**
   * Busca fora de um componente e devolve o resultado (ou lança). Sempre vai à
   * rede — ignora o `staleTime` do recurso — e deixa o resultado no cache, então
   * um `useQuery` montado logo depois já o encontra. Serve pra "só troca a chave
   * se o destino carregar", sem entrar em estado de erro na chave nova.
   */
  fetch = (qc: QueryClient, id: string): Promise<TData> =>
    qc.fetchQuery({ queryKey: this.key(id), queryFn: () => this.config.fetch(id), staleTime: 0 });

  /** Semeia o cache com um resultado já obtido (servidor via `container.X`, ou uma escrita otimista no cliente). */
  hydrate = (qc: QueryClient, data: TData, id: string): void => {
    qc.setQueryData(this.key(id), data);
  };
}
