export interface CursorPage<T> {
  items: T[];
  hasMore: boolean;
}

/**
 * Pagina por cursor id usando o cursor nativo do Prisma (busca a linha do
 * cursor, pula ela via `skip: 1`, segue na ordem) — ao contrário de filtrar
 * só por um campo como `createdAt`, não pula/duplica linha quando duas caem
 * no mesmo valor de ordenação (ex.: mesma transação, mesmo timestamp).
 * Cada chamador entra só com o `findMany` já filtrado/ordenado/incluído pro
 * seu caso; este helper cuida da parte repetida (cursor + skip + take + hasMore).
 */
export async function fetchCursorPage<T>(
  findMany: (args: { cursor?: { id: string }; skip?: number; take: number }) => Promise<T[]>,
  cursorId: string | undefined,
  limit: number,
): Promise<CursorPage<T>> {
  const rows = await findMany({
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    take: limit,
  });
  return { items: rows, hasMore: rows.length === limit };
}
