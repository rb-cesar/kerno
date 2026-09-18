// Cliente HTTP para o browser falar com a API Hono do próprio app (mesma
// origem — sem BFF, sem token próprio: o cookie de sessão vai junto sozinho).
// Cada módulo (`@/modules/kanban/client`, `@/modules/chat/client`) monta o seu client fino
// em cima disto.

export class ApiError extends Error {}

/** Chama `/api${path}`. Lança `ApiError` em resposta não-2xx. */
export async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (cause) {
    throw new ApiError("Não foi possível conectar à API", { cause });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(body.error ?? `API ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Envelope `{ ok, error }` para quem prefere não lidar com exceções. */
export async function asResult<T>(promise: Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" };
  }
}
