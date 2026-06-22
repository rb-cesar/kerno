"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertFromMarkdownString, type Transformer } from "@lexical/markdown";
import { $isQuoteNode } from "@lexical/rich-text";
import { $isListNode } from "@lexical/list";
import { $isCodeNode } from "@lexical/code";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  TextNode,
  type LexicalNode,
} from "lexical";

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

/**
 * Ctrl/Cmd+Enter dispara `onSubmit` (ex.: enviar comentário). Não altera o Enter
 * normal — o campo segue multilinha. Em listas/código/citação respeita o bloco.
 */
export function SubmitOnCtrlEnterPlugin({ onSubmit }: { onSubmit: () => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event || !(event.ctrlKey || event.metaKey)) return false;
          event.preventDefault();
          onSubmit();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, onSubmit],
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
