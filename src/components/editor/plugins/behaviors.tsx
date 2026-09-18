"use client";

import { $isCodeNode, registerCodeHighlighting } from "@lexical/code";
import { $isListItemNode, $isListNode } from "@lexical/list";
import { $convertFromMarkdownString, type Transformer } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isQuoteNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  type ElementNode,
  INSERT_LINE_BREAK_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalNode,
  PASTE_COMMAND,
  type RangeSelection,
  TextNode,
} from "lexical";
import { type MutableRefObject, useEffect } from "react";

/** `registerCodeHighlighting` num plugin — usado por qualquer campo com bloco de código. */
export function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerCodeHighlighting(editor), [editor]);
  return null;
}

// Mapa pequeno de emojis por shortcode (:nome:) — sem dependência pesada.
const EMOJI: Record<string, string> = {
  smile: "😄",
  grin: "😁",
  joy: "😂",
  heart: "❤️",
  fire: "🔥",
  tada: "🎉",
  rocket: "🚀",
  eyes: "👀",
  thinking: "🤔",
  ok: "👌",
  "+1": "👍",
  "-1": "👎",
  check: "✅",
  warning: "⚠️",
  bug: "🐛",
};

/** `:smile:` → 😄 ao digitar. */
export function EmojiShortcutPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerNodeTransform(TextNode, (node) => {
        if (!node.isSimpleText()) return;
        const text = node.getTextContent();
        const match = /:([a-z0-9_+-]{2,30}):/i.exec(text);
        if (!match) return;
        const emoji = EMOJI[match[1]!.toLowerCase()];
        if (!emoji) return;
        const next = text.slice(0, match.index) + emoji + text.slice(match.index + match[0].length);
        node.setTextContent(next);
        const caret = match.index + emoji.length;
        node.select(caret, caret);
      }),
    [editor],
  );
  return null;
}

function looksLikeMarkdown(text: string): boolean {
  return (
    /(^|\n)\s*([-*+]\s|\d+\.\s|>\s|#{1,6}\s|```)/.test(text) ||
    /\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|~~[^~]+~~/.test(text)
  );
}

/** Colar markdown converte nos blocos correspondentes (só com o campo vazio). */
export function PasteMarkdownPlugin({ transformers }: { transformers: Transformer[] }) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const cb = (event as ClipboardEvent).clipboardData;
          if (!cb) return false;
          const text = cb.getData("text/plain");
          const html = cb.getData("text/html");
          if (!text) return false;
          if (html && !looksLikeMarkdown(text)) return false;

          let isEmpty = false;
          editor.getEditorState().read(() => {
            isEmpty = $getRoot().getTextContent().trim() === "";
          });
          if (!isEmpty || !looksLikeMarkdown(text)) return false;

          event.preventDefault();
          editor.update(() => {
            $convertFromMarkdownString(text, transformers);
          });
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    [editor, transformers],
  );
  return null;
}

// ── Enter/Shift+Enter — entrada e saída de blocos (lista, código, citação) ────
// LISTA: Shift+Enter num item vazio SAI da lista (Backspace volta) — convenção
// Notion/Docs.
// CÓDIGO/CITAÇÃO: Enter/Shift+Enter sempre quebram linha (conteúdo multi-linha);
// para SAIR usa-se a SETA PARA BAIXO na última linha (igual clicar abaixo do
// bloco) — ver ExitBlockOnArrowDownPlugin. Enter nunca sai de bloco de código,
// que é a convenção de editores de código.

/** Sobe a árvore a partir da seleção e captura o bloco-alvo do Enter. */
function findEnclosingBlock(selection: RangeSelection): {
  listItem: LexicalNode | null;
  codeOrQuote: ElementNode | null;
} {
  let node: LexicalNode | null = selection.anchor.getNode();
  while (node) {
    if ($isListItemNode(node)) return { listItem: node, codeOrQuote: null };
    if ($isListNode(node)) {
      // Seleção diretamente no nó da lista (item vazio recém-criado): pega o filho.
      const child = node.getChildAtIndex(selection.anchor.offset) ?? node.getLastChild();
      return { listItem: $isListItemNode(child) ? child : null, codeOrQuote: null };
    }
    if ($isCodeNode(node) || $isQuoteNode(node)) return { listItem: null, codeOrQuote: node };
    node = node.getParent();
  }
  return { listItem: null, codeOrQuote: null };
}

/**
 * Offset absoluto (em caracteres) do cursor dentro do bloco. Calculado somando o
 * tamanho dos filhos/irmãos anteriores — NÃO depende de em qual nó a âncora caiu
 * (no código com highlight ela pode parar no próprio CodeNode, num token de
 * conteúdo ou num token vazio do fim; tudo dá o mesmo offset lógico).
 */
function blockOffset(block: ElementNode, selection: RangeSelection): number {
  const anchor = selection.anchor;
  const node = anchor.getNode();
  if (node.getKey() === block.getKey()) {
    const children = block.getChildren();
    let sum = 0;
    for (let i = 0; i < anchor.offset && i < children.length; i += 1) {
      sum += children[i]!.getTextContentSize();
    }
    return sum;
  }
  let sum = anchor.offset;
  let prev = node.getPreviousSibling();
  while (prev) {
    sum += prev.getTextContentSize();
    prev = prev.getPreviousSibling();
  }
  return sum;
}

/** A seleção está na ÚLTIMA linha do bloco (não há "\n" depois do cursor)? */
function isOnLastLine(block: ElementNode, selection: RangeSelection): boolean {
  const text = block.getTextContent();
  return text.indexOf("\n", blockOffset(block, selection)) === -1;
}

/** Sai da lista: cria um parágrafo após a lista e remove o item vazio. */
function exitList(listItem: LexicalNode): void {
  const topElement = listItem.getTopLevelElement();
  const parentList = listItem.getParent();
  const paragraph = $createParagraphNode();
  if (topElement) topElement.insertAfter(paragraph);
  listItem.remove();
  if ($isListNode(parentList) && parentList.getChildrenSize() === 0) parentList.remove();
  paragraph.select();
}

/**
 * Dispara `onSubmit` conforme `mode`:
 *  - `"mod-enter"` (default): só Ctrl/Cmd+Enter envia. O Enter normal segue
 *    multilinha nativo — usado em campos de comentário/descrição.
 *  - `"enter"`: Enter envia; Shift+Enter quebra linha; Ctrl/Cmd+Enter também
 *    envia. Dentro de lista/citação/bloco de código, Enter continua o bloco (não
 *    envia). Numa linha vazia ao fim de uma lista, Shift+Enter SAI dela. Usado
 *    pelo composer de chat.
 *
 * `menuOpenRefs` (só relevante em `"enter"`): enquanto algum ref estiver `true`
 * (menu de emoji/menção/comando aberto), o Enter não é interceptado — quem
 * renderiza o menu trata a tecla.
 */
export function SubmitPlugin({
  mode = "mod-enter",
  onSubmit,
  menuOpenRefs = [],
}: {
  mode?: "enter" | "mod-enter";
  onSubmit: () => void;
  menuOpenRefs?: MutableRefObject<boolean>[];
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (mode === "mod-enter") {
            if (!event || !(event.ctrlKey || event.metaKey)) return false;
            event.preventDefault();
            onSubmit();
            return true;
          }

          if (!event) return false;
          // Se um menu (emoji/"/"/menção) está aberto, deixa-o tratar o Enter.
          if (menuOpenRefs.some((ref) => ref.current)) return false;

          // Detecta o bloco atual subindo a árvore de pais (robusto a aninhamento).
          const selection = $getSelection();
          const { listItem, codeOrQuote } = $isRangeSelection(selection)
            ? findEnclosingBlock(selection)
            : { listItem: null, codeOrQuote: null };
          const inCodeOrQuote = codeOrQuote !== null;

          if (event.shiftKey) {
            event.preventDefault();
            if (!$isRangeSelection(selection)) {
              editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
              return true;
            }
            // Lista: item vazio SAI da lista (Shift+Enter "duas vezes" no fim);
            // item com conteúdo cria um novo item (continua a lista).
            if (listItem) {
              if (listItem.getTextContent().trim() === "") exitList(listItem);
              else selection.insertParagraph();
              return true;
            }
            // Código/citação: sempre quebra suave nativa (conteúdo multi-linha).
            // Para SAIR do bloco usa-se a seta para baixo (ExitBlockOnArrowDownPlugin).
            if (codeOrQuote) {
              editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
              return true;
            }
            // Texto normal: cria um NOVO PARÁGRAFO (não quebra suave), para que
            // "- " / "1. " no começo da linha nova convertam em lista.
            selection.insertParagraph();
            return true;
          }

          // Ctrl/Cmd+Enter sempre envia (útil para enviar de dentro de uma lista).
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onSubmit();
            return true;
          }

          // Em bloco de código/citação o Enter mantém o comportamento nativo (nova
          // linha) para permitir conteúdo multi-linha. Em lista (e texto normal),
          // Enter envia — só o Shift+Enter cria item/quebra.
          if (inCodeOrQuote) return false;

          event.preventDefault();
          onSubmit();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, mode, onSubmit, menuOpenRefs],
  );
  return null;
}

/**
 * Seta para baixo na ÚLTIMA linha de um bloco de código/citação SAI do bloco para
 * o bloco seguinte (cria um parágrafo se não houver) — como clicar logo abaixo.
 * É a forma de "sair" de código, já que ali o Enter é sempre quebra de linha.
 */
export function ExitBlockOnArrowDownPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;

          // Acha o bloco código/citação que contém o cursor.
          let block: ElementNode | null = null;
          let node: LexicalNode | null = selection.anchor.getNode();
          while (node) {
            if ($isCodeNode(node) || $isQuoteNode(node)) {
              block = node;
              break;
            }
            node = node.getParent();
          }
          if (!block) return false;

          // Só intercepta na última linha; nas demais, deixa a navegação nativa
          // mover entre as linhas do bloco.
          if (!isOnLastLine(block, selection)) return false;

          event?.preventDefault();
          const next = block.getNextSibling();
          if (next && $isElementNode(next)) {
            next.selectStart();
          } else {
            const paragraph = $createParagraphNode();
            block.insertAfter(paragraph);
            paragraph.select();
          }
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor],
  );
  return null;
}

export type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
  ul: boolean;
  ol: boolean;
  quote: boolean;
  codeblock: boolean;
};

export const NO_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
  ul: false,
  ol: false,
  quote: false,
  codeblock: false,
};

/** Calcula os formatos ativos na seleção (p/ destacar a toolbar). */
export function $computeActiveFormats(): ActiveFormats {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return NO_FORMATS;
  const active: ActiveFormats = {
    ...NO_FORMATS,
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    strikethrough: selection.hasFormat("strikethrough"),
    code: selection.hasFormat("code"),
  };
  let node: LexicalNode | null = selection.anchor.getNode();
  while (node) {
    if ($isListNode(node)) {
      if (node.getListType() === "number") active.ol = true;
      else active.ul = true;
    }
    if ($isQuoteNode(node)) active.quote = true;
    if ($isCodeNode(node)) active.codeblock = true;
    node = node.getParent();
  }
  return active;
}

/** Reporta os formatos ativos a cada update da seleção. */
export function ActiveFormatsPlugin({ onChange }: { onChange: (f: ActiveFormats) => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => onChange($computeActiveFormats()));
      }),
    [editor, onChange],
  );
  return null;
}
