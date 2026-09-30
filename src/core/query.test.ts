import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { QueryResource } from "./query";

const resource = (fetch: (id: string) => Promise<string>) =>
  new QueryResource<string>({ baseKey: ["teste"], fetch, staleTime: Number.POSITIVE_INFINITY });

describe("QueryResource.fetch", () => {
  it("vai à rede mesmo com o cache 'fresco' (staleTime infinito) e deixa o resultado no cache", async () => {
    const fetch = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    const r = resource(fetch);
    // Mesmo staleTime padrão do app (ver QueryResource.makeQueryClient): sem o `staleTime: 0` do
    // fetch, a 2ª chamada seria servida do cache.
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

    expect(await r.fetch(qc, "a")).toBe("v1");
    expect(await r.fetch(qc, "a")).toBe("v2"); // não serviu o cache: trocar de board sempre revalida
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(qc.getQueryData(r.key("a"))).toBe("v2");
  });

  it("propaga o erro e não grava dado nenhum na chave", async () => {
    const r = resource(async () => {
      throw new Error("falhou");
    });
    const qc = new QueryClient();

    await expect(r.fetch(qc, "a")).rejects.toThrow("falhou");
    expect(qc.getQueryData(r.key("a"))).toBeUndefined();
  });

  it("uma chave que falha não afeta os dados já em cache de outra (trocar de board que falha não estraga o atual)", async () => {
    const r = resource(async (id) => {
      if (id === "ruim") throw new Error("falhou");
      return `dados-${id}`;
    });
    const qc = new QueryClient();
    await r.fetch(qc, "atual");

    await expect(r.fetch(qc, "ruim")).rejects.toThrow();
    expect(qc.getQueryData(r.key("atual"))).toBe("dados-atual");
  });
});
