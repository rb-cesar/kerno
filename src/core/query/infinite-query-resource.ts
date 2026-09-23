"use client";

import { type QueryClient, type QueryKey, useInfiniteQuery } from "@tanstack/react-query";
import type { CursorPage } from "@/core/pagination";

/**
 * Lista paginada por cursor (notificações, cards de uma coluna...) —
 * reaproveita o formato `{ items, hasMore }` já usado pelo cliente hoje
 * (mesmo contrato de `core/pagination.ts`, do lado servidor).
 */
export class InfiniteQueryResource<TArgs extends unknown[], TItem extends { id: string }> {
  constructor(
    private config: {
      baseKey: QueryKey;
      keyArgs: (...args: TArgs) => QueryKey;
      fetchPage: (cursorId: string | undefined, ...args: TArgs) => Promise<CursorPage<TItem>>;
    },
  ) {}

  get baseKey(): QueryKey {
    return this.config.baseKey;
  }

  key = (...args: TArgs): QueryKey => [...this.config.baseKey, ...this.config.keyArgs(...args)];

  useInfiniteQuery = (...args: TArgs) =>
    useInfiniteQuery({
      queryKey: this.key(...args),
      queryFn: ({ pageParam }) => this.config.fetchPage(pageParam as string | undefined, ...args),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last: CursorPage<TItem>) => (last.hasMore ? last.items.at(-1)?.id : undefined),
    });

  /** Servidor: semeia a primeira página já obtida. */
  hydrate = (qc: QueryClient, firstPage: CursorPage<TItem>, ...args: TArgs): void => {
    qc.setQueryData(this.key(...args), { pages: [firstPage], pageParams: [undefined] });
  };

  invalidate = (qc: QueryClient, ...args: TArgs) => qc.invalidateQueries({ queryKey: this.key(...args) });
}
