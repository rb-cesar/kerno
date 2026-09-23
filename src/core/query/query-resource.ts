"use client";

import { type QueryClient, type QueryKey, useQuery } from "@tanstack/react-query";

/**
 * Recurso de valor único (board, detalhe de card, métricas...) — chave e
 * fetcher definidos uma vez, reaproveitados por `useQuery` (cliente) e
 * `hydrate` (Server Component, pra semear o cache com um resultado que já
 * veio de `container.X` sem rechamar `fetch`). `.hydrate()`/`.useQuery()`
 * computam a chave a partir do mesmo `keyArgs`, então nunca divergem entre
 * dois arquivos.
 *
 * Nota: `resource.useQuery(...)` (chamada por membro, não por identificador
 * `use...` solto) pode não ser reconhecida como hook por lint estático de
 * "rules of hooks" — uso indevido em condicional/loop não é pego
 * automaticamente. Ver discussão no plano de arquitetura.
 */
export class QueryResource<TArgs extends unknown[], TData> {
  constructor(
    private config: {
      baseKey: QueryKey;
      keyArgs: (...args: TArgs) => QueryKey;
      /** Fetcher do cliente (ex.: `kanbanClient.snapshot`) — nunca uma service call direta de servidor. */
      fetch: (...args: TArgs) => Promise<TData>;
      staleTime?: number;
      gcTime?: number;
    },
  ) {}

  get baseKey(): QueryKey {
    return this.config.baseKey;
  }

  key = (...args: TArgs): QueryKey => [...this.config.baseKey, ...this.config.keyArgs(...args)];

  useQuery = (...args: TArgs) =>
    useQuery({
      queryKey: this.key(...args),
      queryFn: () => this.config.fetch(...args),
      staleTime: this.config.staleTime,
      gcTime: this.config.gcTime,
    });

  /** Servidor: semeia o cache com um resultado já obtido (ex.: via `container.X`). */
  hydrate = (qc: QueryClient, data: TData, ...args: TArgs): void => {
    qc.setQueryData(this.key(...args), data);
  };

  invalidate = (qc: QueryClient, ...args: TArgs) => qc.invalidateQueries({ queryKey: this.key(...args) });

  invalidateAll = (qc: QueryClient) => qc.invalidateQueries({ queryKey: this.config.baseKey });
}
