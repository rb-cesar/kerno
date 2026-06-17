"use client";

import { useCallback, useEffect, useRef, useTransition, type MutableRefObject } from "react";
import {
  Bold,
  Braces,
  Code,
  Italic,
  List,
  ListOrdered,
  Quote,
  SendHorizonal,
  Strikethrough,
} from "lucide-react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { AutoLinkPlugin, createLinkMatcherWithRegExp } from "@lexical/react/LexicalAutoLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CODE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
  type Transformer,
} from "@lexical/markdown";
import { $createQuoteNode, $isQuoteNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $isListItemNode,
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import {
  $createCodeNode,
  $isCodeNode,
  CodeHighlightNode,
  CodeNode,
  registerCodeHighlighting,
} from "@lexical/code";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  FORMAT_TEXT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_MODIFIER_COMMAND,
  TextNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { Button, cn } from "@kerno/ui";
import { EmojiPickerButton, EmojiTypeaheadPlugin } from "./emoji-plugin";
import { SlashCommandPlugin } from "./slash-plugin";

// Subconjunto de transformers — markdown como atalho de digitação (símbolos somem
// ao digitar) e formato de serialização. Sem headings (é chat).
const TRANSFORMERS: Transformer[] = [
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
  QUOTE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  INLINE_CODE,
  LINK,
];

// Detecta URLs digitadas e as transforma em links automaticamente.
const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;
const LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) =>
    text.startsWith("http") ? text : `https://${text}`,
  ),
];

// Base para emojis por shortcode (:nome:). Um picker estilo Discord (typeahead no
// ":") pode ser plugado depois reaproveitando este mapa — ver EmojiShortcutPlugin.
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

// Classes do tema = como a formatação aparece AO VIVO no campo (espelha o
// MessageContent que renderiza as mensagens recebidas).
const theme = {
  paragraph: "m-0",
  quote: "border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground",
  list: { ul: "list-disc pl-5", ol: "list-decimal pl-5", listitem: "ml-0" },
  code: "block overflow-x-auto rounded-md bg-muted p-2 font-mono text-[0.85em]",
  link: "text-primary underline underline-offset-2",
  text: {
    bold: "font-semibold",
    italic: "italic",
    strikethrough: "line-through",
    code: "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]",
  },
  codeHighlight: {
    comment: "text-muted-foreground italic",
    keyword: "text-purple-400",
    string: "text-emerald-400",
    number: "text-amber-400",
    boolean: "text-amber-400",
    function: "text-blue-400",
    "class-name": "text-yellow-300",
    property: "text-sky-400",
    attr: "text-sky-400",
    tag: "text-rose-400",
    operator: "text-muted-foreground",
    punctuation: "text-muted-foreground",
    selector: "text-emerald-400",
    variable: "text-foreground",
  },
};

// ── Plugins ──────────────────────────────────────────────────────────────────

function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerCodeHighlighting(editor), [editor]);
  return null;
}

function EmojiShortcutPlugin() {
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

/** Atalhos extras (Slack): tachado e código inline. Negrito/itálico já são nativos. */
function FormatShortcutsPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_MODIFIER_COMMAND,
        (event) => {
          if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return false;
          const key = event.key.toLowerCase();
          if (key === "x") {
            event.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
            return true;
          }
          if (key === "c") {
            event.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    [editor],
  );
  return null;
}

/**
 * Enter envia; Shift+Enter quebra linha; Ctrl/Cmd+Enter também envia. Dentro de
 * lista / citação / bloco de código, Enter continua o bloco (não envia).
 */
function EnterToSendPlugin({
  onSubmit,
  menuOpenRefs,
}: {
  onSubmit: () => void;
  menuOpenRefs: MutableRefObject<boolean>[];
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event) return false;
          // Se um menu (emoji "/"/comandos) está aberto, deixa-o tratar o Enter.
          if (menuOpenRefs.some((ref) => ref.current)) return false;

          // Detecta o bloco atual subindo a árvore de pais (robusto a aninhamento).
          let inList = false;
          let inCodeOrQuote = false;
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            let node: LexicalNode | null = selection.anchor.getNode();
            while (node) {
              if ($isListNode(node) || $isListItemNode(node)) {
                inList = true;
                break;
              }
              if ($isCodeNode(node) || $isQuoteNode(node)) {
                inCodeOrQuote = true;
                break;
              }
              node = node.getParent();
            }
          }

          if (event.shiftKey) {
            event.preventDefault();
            // Numa lista, a "quebra de linha" cria um novo item (continua a lista);
            // fora dela, insere uma quebra suave. Usamos insertParagraph() direto
            // (vale p/ lista pontilhada E numerada) — dispatchCommand não criava o item.
            if (inList && $isRangeSelection(selection)) {
              selection.insertParagraph();
            } else {
              editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
            }
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
    [editor, onSubmit, menuOpenRefs],
  );
  return null;
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

function ToolbarButton({
  title,
  busy,
  onClick,
  children,
}: {
  title: string;
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={busy}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        busy && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, busy }: { editor: LexicalEditor; busy: boolean }) {
  const setBlock = (create: () => QuoteNode | ReturnType<typeof $createCodeNode>) =>
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $setBlocksType(selection, create);
    });

  const toggleCodeBlock = () =>
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      // Já dentro de um bloco de código? volta para parágrafo (toggle).
      let node: LexicalNode | null = selection.anchor.getNode();
      while (node) {
        if ($isCodeNode(node)) {
          $setBlocksType(selection, () => $createParagraphNode());
          return;
        }
        node = node.getParent();
      }

      $setBlocksType(selection, () => $createCodeNode());

      // Garante um parágrafo antes e depois, para escrever fora do bloco.
      const after = $getSelection();
      if ($isRangeSelection(after)) {
        const block = after.anchor.getNode().getTopLevelElement();
        if (block) {
          if (block.getNextSibling() === null) block.insertAfter($createParagraphNode());
          if (block.getPreviousSibling() === null) block.insertBefore($createParagraphNode());
        }
      }
    });

  return (
    <div className="flex items-center gap-0.5 border-b px-1.5 py-1">
      <ToolbarButton title="Negrito (Ctrl+B)" busy={busy} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Itálico (Ctrl+I)" busy={busy} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Tachado (Ctrl+Shift+X)" busy={busy} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}>
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Código (Ctrl+Shift+C)" busy={busy} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton title="Lista" busy={busy} onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Lista numerada" busy={busy} onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Citação" busy={busy} onClick={() => setBlock(() => $createQuoteNode())}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Bloco de código" busy={busy} onClick={toggleCodeBlock}>
        <Braces className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <EmojiPickerButton busy={busy} />
    </div>
  );
}

// ── Composer ─────────────────────────────────────────────────────────────────

function ComposerInner({
  disabled,
  placeholder,
  onSend,
}: {
  disabled?: boolean;
  placeholder: string;
  onSend: (content: string) => Promise<void>;
}) {
  const [editor] = useLexicalComposerContext();
  const [pending, startTransition] = useTransition();
  const busy = Boolean(disabled) || pending;
  const emojiMenuOpen = useRef(false);
  const slashMenuOpen = useRef(false);

  useEffect(() => {
    editor.setEditable(!busy);
  }, [editor, busy]);

  const submit = useCallback(() => {
    let markdown = "";
    editor.getEditorState().read(() => {
      markdown = $convertToMarkdownString(TRANSFORMERS).trim();
    });
    if (!markdown) return;

    startTransition(async () => {
      await onSend(markdown);
    });

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.select();
    });
  }, [editor, onSend]);

  return (
    <div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
      <Toolbar editor={editor} busy={busy} />
      <div className="flex items-end gap-2 p-2">
        <div className="relative min-w-0 flex-1">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="max-h-48 min-h-[1.5rem] overflow-y-auto px-1 py-1.5 text-sm leading-relaxed outline-none"
                aria-label="Mensagem"
              />
            }
            placeholder={
              <div className="pointer-events-none absolute left-1 top-1.5 select-none text-sm text-muted-foreground">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <Button size="icon" disabled={busy} onClick={submit} title="Enviar (Enter)">
          <SendHorizonal />
        </Button>
      </div>

      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <AutoLinkPlugin matchers={LINK_MATCHERS} />
      <CodeHighlightPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <FormatShortcutsPlugin />
      <EmojiShortcutPlugin />
      <EmojiTypeaheadPlugin menuOpenRef={emojiMenuOpen} />
      <SlashCommandPlugin menuOpenRef={slashMenuOpen} />
      <EnterToSendPlugin onSubmit={submit} menuOpenRefs={[emojiMenuOpen, slashMenuOpen]} />
    </div>
  );
}

export function MessageComposer({
  disabled,
  placeholder = "Escreva uma mensagem…",
  onSend,
}: {
  disabled?: boolean;
  placeholder?: string;
  onSend: (content: string) => Promise<void>;
}) {
  const initialConfig = {
    namespace: "kerno-chat",
    theme,
    nodes: [QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, CodeNode, CodeHighlightNode],
    onError: (error: Error) => {
      console.error("[chat-composer] erro no editor:", error);
    },
  };

  return (
    <div className="border-t p-3">
      <LexicalComposer initialConfig={initialConfig}>
        <ComposerInner disabled={disabled} placeholder={placeholder} onSend={onSend} />
      </LexicalComposer>
      <p className="mt-1 px-1 text-[11px] text-muted-foreground">
        Enter envia · Shift+Enter quebra linha · / abre comandos · :emoji: vira emoji ·
        Ctrl+Enter envia
      </p>
    </div>
  );
}
