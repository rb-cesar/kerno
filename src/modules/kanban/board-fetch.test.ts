import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kanbanClient } from "./client";
import { kanbanBoardResource } from "./queries";
import type { BoardData } from "./types";

afterEach(() => vi.restoreAllMocks());

const board = { id: "b1", name: "B1", columns: [] } as unknown as BoardData;

describe("kanbanBoardResource", () => {
  it("snapshot nulo (o client engole o erro de rede) vira erro — não é cacheado como sucesso para sempre", async () => {
    vi.spyOn(kanbanClient, "snapshot").mockResolvedValue(null);
    const qc = new QueryClient();

    await expect(kanbanBoardResource.fetch(qc, "b1")).rejects.toThrow("Falha ao carregar o board");
    expect(qc.getQueryData(kanbanBoardResource.key("b1"))).toBeUndefined();
  });

  it("snapshot válido é devolvido e fica no cache, pronto para o useQuery da chave nova", async () => {
    vi.spyOn(kanbanClient, "snapshot").mockResolvedValue(board);
    const qc = new QueryClient();

    expect(await kanbanBoardResource.fetch(qc, "b1")).toBe(board);
    expect(qc.getQueryData(kanbanBoardResource.key("b1"))).toBe(board);
  });
});
