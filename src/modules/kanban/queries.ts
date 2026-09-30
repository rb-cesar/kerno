// Instâncias do módulo — arquivo plano, sem "use client": Server Components
// importam pra chamar `.hydrate()`/`.key()`, Client Components importam pra
// chamar `.useQuery()`. Nunca passar a instância em si como prop.
import type { QueryClient } from "@tanstack/react-query";
import { QueryResource } from "@/core/query";
import { kanbanClient } from "./client";
import type { BoardData, KanbanFetch, KanbanFetchColumnCards } from "./types";

export const kanbanBoardResource = new QueryResource<BoardData>({
  baseKey: ["kanban", "board"],
  // `snapshot` engole o erro e devolve `null` — sem lançar aqui, o React Query
  // trataria `null` como sucesso: cacheado pra sempre (staleTime infinito) e
  // sem retry.
  fetch: async (boardId) => {
    const board = await kanbanClient.snapshot(boardId);
    if (!board) throw new Error("Falha ao carregar o board");
    return board;
  },
  // O realtime (useKanbanRealtime → refresh()) e as próprias mutações já
  // mantêm isso atualizado explicitamente — sem staleTime alto, o React
  // Query poderia refazer a busca sozinho (foco de janela, reconexão) e
  // pisar num dado que já estava correto. https://tkdodo.eu/blog/using-web-sockets-with-react-query
  staleTime: Number.POSITIVE_INFINITY,
});

/**
 * Re-busca o snapshot do board e o grava no cache — o único "resync" do board, usado
 * pelo próprio board (realtime, drag&drop que falhou) e pelo painel da tarefa no dock.
 *
 * O painel vive FORA da árvore do board e edita cards por conta própria; sem gravar aqui
 * a edição nunca chegaria ao board: o realtime ignora eventos do próprio usuário (parte
 * do princípio de que já foram aplicados localmente) e o cache tem staleTime infinito.
 *
 * Um snapshot novo só traz a 1ª página de cada coluna: repõe a profundidade que o cache
 * já tinha ("carregar mais") buscando as páginas seguintes. Grava sempre em `boardId` (o
 * board que foi buscado), nunca no "board ativo" do momento em que a busca termina.
 */
export async function refreshKanbanBoard(
  qc: QueryClient,
  boardId: string,
  fetchers: { snapshot: KanbanFetch; columnCards: KanbanFetchColumnCards },
): Promise<BoardData | null> {
  const fresh = await fetchers.snapshot(boardId);
  if (!fresh) return null;

  const previous = qc.getQueryData<BoardData>(kanbanBoardResource.key(boardId));
  const prevCountByColumn = new Map((previous?.columns ?? []).map((c) => [c.id, c.cards.length]));

  const columns = await Promise.all(
    fresh.columns.map(async (column) => {
      const prevCount = prevCountByColumn.get(column.id) ?? 0;
      if (prevCount <= column.cards.length || !column.hasMoreCards) return column;

      let cards = column.cards;
      let hasMoreCards: boolean = column.hasMoreCards;
      while (cards.length < prevCount && hasMoreCards) {
        const page = await fetchers.columnCards(column.id, cards.at(-1)?.id);
        if (page.items.length === 0) break;
        cards = [...cards, ...page.items];
        hasMoreCards = page.hasMore;
      }
      return { ...column, cards, hasMoreCards };
    }),
  );

  const board = { ...fresh, columns };
  kanbanBoardResource.hydrate(qc, board, boardId);
  return board;
}
