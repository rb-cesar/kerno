import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { kanbanBoardResource } from "../queries";
import type { BoardData, CardDTO, ColumnDTO } from "../types";
import { appendColumnPage } from "./board-cache";

const card = (id: string): CardDTO => ({
  id,
  number: 1,
  title: id,
  description: null,
  columnId: "c1",
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

const column = (id: string, cards: CardDTO[], hasMoreCards = true): ColumnDTO => ({
  id,
  name: id,
  order: 0,
  category: "BACKLOG",
  color: null,
  wipLimit: null,
  cards,
  totalCards: 10,
  hasMoreCards,
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

const titles = (qc: QueryClient, boardId: string, columnId: string) =>
  qc
    .getQueryData<BoardData>(kanbanBoardResource.key(boardId))
    ?.columns.find((c) => c.id === columnId)
    ?.cards.map((c) => c.id);

describe("appendColumnPage", () => {
  it("acrescenta a página à coluna e atualiza hasMoreCards", () => {
    const qc = new QueryClient();
    kanbanBoardResource.hydrate(qc, board("A", [column("c1", [card("k1")]), column("c2", [card("x1")])]), "A");

    appendColumnPage(qc, "A", "c1", { items: [card("k2"), card("k3")], hasMore: false });

    expect(titles(qc, "A", "c1")).toEqual(["k1", "k2", "k3"]);
    expect(titles(qc, "A", "c2")).toEqual(["x1"]); // outras colunas intactas
    expect(qc.getQueryData<BoardData>(kanbanBoardResource.key("A"))?.columns[0]?.hasMoreCards).toBe(false);
  });

  it("grava só no board informado, mesmo que outro seja o ativo quando a página chega", () => {
    const qc = new QueryClient();
    kanbanBoardResource.hydrate(qc, board("A", [column("c1", [card("k1")])]), "A");
    kanbanBoardResource.hydrate(qc, board("B", [column("c1", [card("b1")])]), "B"); // mesma id de coluna, de propósito

    appendColumnPage(qc, "A", "c1", { items: [card("k2")], hasMore: true });

    expect(titles(qc, "A", "c1")).toEqual(["k1", "k2"]);
    expect(titles(qc, "B", "c1")).toEqual(["b1"]);
  });

  it("não cria entrada no cache para um board que não está lá", () => {
    const qc = new QueryClient();
    appendColumnPage(qc, "fantasma", "c1", { items: [card("k1")], hasMore: false });
    expect(qc.getQueryData(kanbanBoardResource.key("fantasma"))).toBeUndefined();
  });

  it("não duplica cards que um refresh já trouxe enquanto a página estava a caminho", () => {
    const qc = new QueryClient();
    kanbanBoardResource.hydrate(qc, board("A", [column("c1", [card("k1"), card("k2")])]), "A");

    appendColumnPage(qc, "A", "c1", { items: [card("k2"), card("k3")], hasMore: false });

    expect(titles(qc, "A", "c1")).toEqual(["k1", "k2", "k3"]);
  });
});
