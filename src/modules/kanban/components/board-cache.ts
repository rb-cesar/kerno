import type { QueryClient } from "@tanstack/react-query";
import { kanbanBoardResource } from "../queries";
import type { BoardData, CardsPage } from "../types";

/**
 * Acrescenta a página seguinte de uma coluna ("carregar mais") ao board em cache.
 *
 * `boardId` é o do momento em que o pedido COMEÇOU, passado por quem chama: ler o "board
 * ativo" depois do `await` gravaria a página no board errado se o usuário trocasse de board
 * no meio. Cards já presentes (ex.: um refresh repôs a profundidade enquanto a página vinha)
 * não são duplicados.
 */
export function appendColumnPage(qc: QueryClient, boardId: string, columnId: string, page: CardsPage): void {
  qc.setQueryData<BoardData>(kanbanBoardResource.key(boardId), (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      columns: prev.columns.map((column) => {
        if (column.id !== columnId) return column;
        const known = new Set(column.cards.map((c) => c.id));
        const added = page.items.filter((c) => !known.has(c.id));
        return { ...column, cards: [...column.cards, ...added], hasMoreCards: page.hasMore };
      }),
    };
  });
}
