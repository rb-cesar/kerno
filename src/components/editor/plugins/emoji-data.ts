// Fonte única de emojis (emoji-mart), carregada sob demanda (dynamic import) — o
// dataset completo só entra no bundle quando o usuário usa emoji pela 1ª vez.
// Alimenta tanto o autocomplete ":" quanto o picker da toolbar.

type RawEmoji = { id: string; name: string; skins?: Array<{ native?: string }> };

export type EmojiResult = { id: string; native: string; name: string };

let readyPromise: Promise<void> | null = null;
let searchIndex: { search: (query: string) => Promise<RawEmoji[]> } | null = null;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const core = await import("emoji-mart");
      const data = (await import("@emoji-mart/data")).default;
      core.init({ data });
      searchIndex = core.SearchIndex as unknown as {
        search: (query: string) => Promise<RawEmoji[]>;
      };
    })();
  }
  await readyPromise;
}

export async function searchEmojis(query: string, limit = 8): Promise<EmojiResult[]> {
  await ensureReady();
  if (!searchIndex) return [];
  const raw = (await searchIndex.search(query)) ?? [];
  return raw
    .slice(0, limit)
    .map((emoji) => ({
      id: emoji.id,
      name: emoji.name,
      native: emoji.skins?.[0]?.native ?? "",
    }))
    .filter((emoji) => emoji.native.length > 0);
}
