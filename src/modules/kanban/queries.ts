// Instâncias do módulo — arquivo plano, sem "use client": Server Components
// importam pra chamar `.hydrate()`/`.key()`, Client Components importam pra
// chamar `.useQuery()`. Nunca passar a instância em si como prop.
import { QueryResource } from "@/core/query";
import { kanbanClient } from "./client";
import type { BoardData } from "./types";

export const kanbanBoardResource = new QueryResource<BoardData | null>({
  baseKey: ["kanban", "board"],
  fetch: (boardId) => kanbanClient.snapshot(boardId),
  // Troca de board (BoardSwitcher) mantém o board anterior visível até o novo carregar.
  keepPreviousData: true,
  // O realtime (useKanbanRealtime → refresh()) e as próprias mutações já
  // mantêm isso atualizado explicitamente — sem staleTime alto, o React
  // Query poderia refazer a busca sozinho (foco de janela, reconexão) e
  // pisar num dado que já estava correto. https://tkdodo.eu/blog/using-web-sockets-with-react-query
  staleTime: Number.POSITIVE_INFINITY,
});
