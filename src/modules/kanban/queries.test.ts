import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { kanbanBoardResource, refreshKanbanBoard } from "./queries";
import type { BoardData, CardDTO, ColumnDTO } from "./types";

const card = (id: string, title: string): CardDTO => ({
  id,
  number: Number(id.replace(/\D/g, "")) || 1,
  title,
  description: null,
  columnId: "col",
  order: 0,
  priority: "NONE",
  dueDate: null,
  estimate: null,
  parentId: null,
  cycleId: null,
  storyId: null,
  storyTitle: null,
  assignedTo: null,
  assignee: null,
  labels: [],
});

const column = (id: string, cards: CardDTO[], total = cards.length): ColumnDTO => ({
  id,
  name: id,
  order: 0,
  category: "BACKLOG",
  color: null,
  wipLimit: null,
  cards,
  totalCards: total,
  hasMoreCards: total > cards.length,
});

const board = (id: string, columns: ColumnDTO[]): BoardData => ({
  id,
  name: id,
  workspaceId: "ws",
  workspaceKey: "KERN",
  boards: [{ id, name: id }],
  columns,
  labels: [],
  cycles: [],
  stories: [],
  members: [],
});

const noPages = async () => ({ items: [], hasMore: false });

describe("refreshKanbanBoard", () => {
  it("grava o snapshot novo no cache do board — é o que faz uma edição feita no painel chegar ao board", async () => {
    const qc = new QueryClient();
    kanbanBoardResource.hydrate(qc, board("A", [column("c1", [card("k1", "título antigo")])]), "A");

    const fresh = board("A", [column("c1", [card("k1", "título novo")])]);
    const result = await refreshKanbanBoard(qc, "A", { snapshot: async () => fresh, columnCards: noPages });

    const cached = qc.getQueryData<BoardData>(kanbanBoardResource.key("A"));
    expect(cached?.columns[0]?.cards[0]?.title).toBe("título novo");
    expect(result).toEqual(cached);
  });

  it("repõe a profundidade de páginas que o board já tinha carregado ('carregar mais')", async () => {
    const qc = new QueryClient();
    // O board mostra 3 cards da coluna (1ª página + 2 de "carregar mais"), de 5 no total.
    kanbanBoardResource.hydrate(
      qc,
      board("A", [column("c1", [card("k1", "1"), card("k2", "2"), card("k3", "3")], 5)]),
      "A",
    );

    // O snapshot novo só traz a 1ª página (1 card), e o card 1 foi editado.
    const fresh = board("A", [column("c1", [card("k1", "1 editado")], 5)]);
    const columnCards = vi
      .fn()
      .mockResolvedValueOnce({ items: [card("k2", "2")], hasMore: true })
      .mockResolvedValueOnce({ items: [card("k3", "3")], hasMore: true });

    await refreshKanbanBoard(qc, "A", { snapshot: async () => fresh, columnCards });

    const cards = qc.getQueryData<BoardData>(kanbanBoardResource.key("A"))?.columns[0]?.cards;
    expect(cards?.map((c) => c.title)).toEqual(["1 editado", "2", "3"]);
    expect(columnCards).toHaveBeenNthCalledWith(1, "c1", "k1");
    expect(columnCards).toHaveBeenNthCalledWith(2, "c1", "k2");
  });

  it("grava sempre no board que foi buscado, sem tocar nos outros", async () => {
    const qc = new QueryClient();
    const boardB = board("B", [column("c2", [card("k9", "do B")])]);
    kanbanBoardResource.hydrate(qc, boardB, "B");

    await refreshKanbanBoard(qc, "A", {
      snapshot: async () => board("A", [column("c1", [card("k1", "do A")])]),
      columnCards: noPages,
    });

    expect(qc.getQueryData(kanbanBoardResource.key("B"))).toEqual(boardB);
    expect(qc.getQueryData<BoardData>(kanbanBoardResource.key("A"))?.columns[0]?.cards[0]?.title).toBe("do A");
  });

  it("se o snapshot falhar, devolve null e não mexe no cache", async () => {
    const qc = new QueryClient();
    const original = board("A", [column("c1", [card("k1", "intacto")])]);
    kanbanBoardResource.hydrate(qc, original, "A");

    const result = await refreshKanbanBoard(qc, "A", { snapshot: async () => null, columnCards: noPages });

    expect(result).toBeNull();
    expect(qc.getQueryData(kanbanBoardResource.key("A"))).toEqual(original);
  });
});
