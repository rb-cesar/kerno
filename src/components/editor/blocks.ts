// Parser de blocos do markdown que o editor produz (subconjunto estilo Discord/Slack) —
// compartilhado pelos dois renderizadores (RichTextView e MessageContent do chat), que
// só diferem nas regras inline (menções, tarefas). Puro e sem React, para ser testável.
//
// Regra de espaçamento: cada linha do markdown é UMA linha visual e linha em branco é uma
// linha em branco visível — o mesmo que o editor mostra (ver ./markdown.ts). Antes, os
// renderizadores descartavam as linhas em branco, então parágrafos vazios digitados
// sumiam da exibição.

export type ListItem = { text: string; children: ListBlock[] };
export type ListBlock = { type: "list"; ordered: boolean; items: ListItem[] };
export type Block =
  | { type: "code"; lang: string; code: string }
  | { type: "quote"; lines: string[] }
  | ListBlock
  | { type: "text"; lines: string[] };

const LIST_ITEM = /^(\s*)(?:([-*])|(\d+\.))\s+(.*)$/;
const QUOTE = /^\s*>\s?/;

const isFence = (line: string) => line.trimStart().startsWith("```");
const isBlank = (line: string) => line.trim() === "";
/** Largura da indentação (tab = 4, o mesmo passo que o editor usa nas listas aninhadas). */
const indentWidth = (ws: string) => [...ws].reduce((n, ch) => n + (ch === "\t" ? 4 : 1), 0);

type FlatItem = { indent: number; ordered: boolean; text: string };

/** Constrói a árvore de uma lista a partir dos itens planos, pela indentação. */
function buildList(items: FlatItem[], pos: { i: number }, indent: number): ListBlock {
  const first = items[pos.i];
  const list: ListBlock = { type: "list", ordered: first?.ordered ?? false, items: [] };

  while (pos.i < items.length) {
    const item = items[pos.i];
    if (!item || item.indent < indent) break; // volta para o nível do pai
    if (item.indent > indent) {
      // Mais indentado que o item anterior → sub-lista dele.
      list.items.at(-1)?.children.push(buildList(items, pos, item.indent));
      continue;
    }
    if (item.ordered !== list.ordered) break; // trocou de tipo neste nível → lista irmã
    list.items.push({ text: item.text, children: [] });
    pos.i += 1;
  }
  return list;
}

export function parseBlocks(content: string): Block[] {
  const all = content.replace(/\r\n?/g, "\n").split("\n");
  // Bordas em branco não são "espaçamento digitado" — só sobra de quem enviou.
  let start = 0;
  let end = all.length;
  while (start < end && isBlank(all[start] ?? "")) start += 1;
  while (end > start && isBlank(all[end - 1] ?? "")) end -= 1;
  const lines = all.slice(start, end);

  const at = (idx: number): string => lines[idx] ?? "";
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = at(i);

    if (isFence(line)) {
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !isFence(at(i))) {
        code.push(at(i));
        i += 1;
      }
      i += 1; // pula o ``` de fechamento
      blocks.push({ type: "code", lang, code: code.join("\n") });
      continue;
    }

    if (QUOTE.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && QUOTE.test(at(i))) {
        quote.push(at(i).replace(QUOTE, ""));
        i += 1;
      }
      blocks.push({ type: "quote", lines: quote });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const flat: FlatItem[] = [];
      while (i < lines.length) {
        const m = LIST_ITEM.exec(at(i));
        if (!m) break;
        flat.push({ indent: indentWidth(m[1] ?? ""), ordered: m[3] !== undefined, text: m[4] ?? "" });
        i += 1;
      }
      const pos = { i: 0 };
      while (pos.i < flat.length) blocks.push(buildList(flat, pos, flat[pos.i]?.indent ?? 0));
      continue;
    }

    // Texto: linhas consecutivas que não abrem outro bloco, INCLUINDO as em branco.
    const text: string[] = [];
    while (i < lines.length && !isFence(at(i)) && !QUOTE.test(at(i)) && !LIST_ITEM.test(at(i))) {
      text.push(at(i));
      i += 1;
    }
    blocks.push({ type: "text", lines: text });
  }

  return blocks;
}

/**
 * O editor escapa caracteres de formatação que o usuário digitou como texto (`snake_case` →
 * `snake\_case`); os renderizadores desfazem isso para mostrar o que foi digitado.
 */
export const ESCAPED_CHAR = /\\([\\`*_~[\]])/;
export const unescapeMarkdown = (text: string): string => text.replace(new RegExp(ESCAPED_CHAR.source, "g"), "$1");
