"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type MutableRefObject,
} from "react";
import {
  Bold,
  Braces,
  Check,
  Code,
  Italic,
  List,
  ListOrdered,
  Quote,
  SendHorizonal,
  Strikethrough,
  X,
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
  $convertFromMarkdownString,
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
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  FORMAT_TEXT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_MODIFIER_COMMAND,
  PASTE_COMMAND,
  TextNode,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
} from "lexical";
import { Button, cn } from "@kerno/ui";
import { EmojiPickerButton, EmojiTypeaheadPlugin } from "./emoji-plugin";
import { SlashCommandPlugin } from "./slash-plugin";
import { MENTION_TRANSFORMER, MentionNode, MentionTypeaheadPlugin } from "./mention-plugin";
import {
  TASK_MENTION_TRANSFORMER,
  TaskMentionNode,
  TaskMentionTypeaheadPlugin,
} from "./task-mention-plugin";

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
  MENTION_TRANSFORMER,
  TASK_MENTION_TRANSFORMER,
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

// ── Entrada/saída de blocos (lista, código, citação) ──────────────────────────
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
 * Enter envia; Shift+Enter quebra linha; Ctrl/Cmd+Enter também envia. Dentro de
 * lista / citação / bloco de código, Enter continua o bloco (não envia). Numa
 * linha vazia ao fim do bloco, o Shift+Enter SAI do bloco (volta ao texto).
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
    [editor, onSubmit, menuOpenRefs],
  );
  return null;
}

/**
 * Seta para baixo na ÚLTIMA linha de um bloco de código/citação SAI do bloco para
 * o bloco seguinte (cria um parágrafo se não houver) — como clicar logo abaixo.
 * É a forma de "sair" de código, já que ali o Enter é sempre quebra de linha.
 */
function ExitBlockOnArrowDownPlugin() {
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

/** Carrega um markdown inicial no editor (edição) e foca no fim, uma única vez. */
function InitialContentPlugin({
  markdown,
  autoFocus,
}: {
  markdown?: string;
  autoFocus?: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (markdown) {
      editor.update(() => {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      });
    }
    if (autoFocus) {
      editor.focus(undefined, { defaultSelection: "rootEnd" });
    }
    // Roda só na montagem (edição abre num editor novo por mensagem).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
  return null;
}

/** Esc cancela (usado na edição inline). */
function EscapeToCancelPlugin({ onCancel }: { onCancel?: () => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!onCancel) return;
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        onCancel();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, onCancel]);
  return null;
}

/** Rascunho por canal/DM: salva o markdown não enviado e restaura ao voltar. */
const DRAFT_PREFIX = "kerno-chat-draft:";

function DraftPlugin({ draftKey }: { draftKey: string }) {
  const [editor] = useLexicalComposerContext();

  // Carrega o rascunho ao montar e a cada troca de alvo (canal/DM).
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_PREFIX + draftKey) : null;
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        if (saved) $convertFromMarkdownString(saved, TRANSFORMERS);
        else root.append($createParagraphNode());
      },
      { tag: "draft-load" },
    );
  }, [editor, draftKey]);

  // Persiste a cada alteração feita pelo usuário (ignora a carga programática).
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState, tags }) => {
        if (tags.has("draft-load")) return;
        let markdown = "";
        editorState.read(() => {
          markdown = $convertToMarkdownString(TRANSFORMERS).trim();
        });
        const key = DRAFT_PREFIX + draftKey;
        if (markdown) window.localStorage.setItem(key, markdown);
        else window.localStorage.removeItem(key);
      }),
    [editor, draftKey],
  );

  return null;
}

/** ↑ no campo vazio edita a última mensagem própria (convenção Slack/Discord). */
function EditLastPlugin({ onRequestEditLast }: { onRequestEditLast?: () => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!onRequestEditLast) return;
    return editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        let empty = false;
        editor.getEditorState().read(() => {
          empty = $getRoot().getTextContent().trim() === "";
        });
        if (!empty) return false;
        event?.preventDefault();
        onRequestEditLast();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, onRequestEditLast]);
  return null;
}

/** Detecta se um texto colado parece markdown (para converter em vez de texto cru). */
function looksLikeMarkdown(text: string): boolean {
  return (
    /(^|\n)\s*([-*+]\s|\d+\.\s|>\s|#{1,6}\s|```)/.test(text) ||
    /\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|~~[^~]+~~/.test(text)
  );
}

/**
 * Colar texto com markdown converte nos blocos correspondentes (MVP: só quando o
 * campo está vazio — evita a complexidade de inserir blocos no meio do conteúdo).
 * Conteúdo rico (text/html) sem cara de markdown segue o paste nativo.
 */
function PasteMarkdownPlugin() {
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
            $convertFromMarkdownString(text, TRANSFORMERS);
          });
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    [editor],
  );
  return null;
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

/** Formatos ativos na seleção — destaca os botões da toolbar (estilo Notion). */
type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
  ul: boolean;
  ol: boolean;
  quote: boolean;
  codeblock: boolean;
};

const NO_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
  ul: false,
  ol: false,
  quote: false,
  codeblock: false,
};

function $computeActiveFormats(): ActiveFormats {
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

function ToolbarButton({
  title,
  busy,
  active,
  onClick,
  children,
}: {
  title: string;
  busy: boolean;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      disabled={busy}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground",
        busy && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  busy,
  active,
}: {
  editor: LexicalEditor;
  busy: boolean;
  active: ActiveFormats;
}) {
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
      <ToolbarButton title="Negrito (Ctrl+B)" busy={busy} active={active.bold} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Itálico (Ctrl+I)" busy={busy} active={active.italic} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Tachado (Ctrl+Shift+X)" busy={busy} active={active.strikethrough} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}>
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Código (Ctrl+Shift+C)" busy={busy} active={active.code} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton title="Lista" busy={busy} active={active.ul} onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Lista numerada" busy={busy} active={active.ol} onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Citação" busy={busy} active={active.quote} onClick={() => setBlock(() => $createQuoteNode())}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Bloco de código" busy={busy} active={active.codeblock} onClick={toggleCodeBlock}>
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
  initialMarkdown,
  onCancel,
  resetAfterSend = true,
  draftKey,
  onRequestEditLast,
}: {
  disabled?: boolean;
  placeholder: string;
  onSend: (content: string) => Promise<void>;
  initialMarkdown?: string;
  onCancel?: () => void;
  resetAfterSend?: boolean;
  draftKey?: string;
  onRequestEditLast?: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [pending, startTransition] = useTransition();
  const busy = Boolean(disabled) || pending;
  const editMode = Boolean(onCancel);
  const emojiMenuOpen = useRef(false);
  const slashMenuOpen = useRef(false);
  const mentionMenuOpen = useRef(false);
  const taskMentionMenuOpen = useRef(false);
  const [active, setActive] = useState<ActiveFormats>(NO_FORMATS);

  useEffect(() => {
    editor.setEditable(!busy);
  }, [editor, busy]);

  // Acompanha os formatos da seleção para destacar os botões da toolbar.
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => setActive($computeActiveFormats()));
      }),
    [editor],
  );

  const submit = useCallback(() => {
    let markdown = "";
    editor.getEditorState().read(() => {
      markdown = $convertToMarkdownString(TRANSFORMERS).trim();
    });
    if (!markdown) return;

    startTransition(async () => {
      await onSend(markdown);
    });

    if (resetAfterSend) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.select();
      });
    }
  }, [editor, onSend, resetAfterSend]);

  return (
    <div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
      <Toolbar editor={editor} busy={busy} active={active} />
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
        {editMode ? (
          <Button
            size="icon"
            variant="ghost"
            disabled={busy}
            onClick={onCancel}
            title="Cancelar (Esc)"
          >
            <X />
          </Button>
        ) : null}
        <Button
          size="icon"
          disabled={busy}
          onClick={submit}
          title={editMode ? "Salvar (Enter)" : "Enviar (Enter)"}
        >
          {editMode ? <Check /> : <SendHorizonal />}
        </Button>
      </div>

      {editMode ? (
        <InitialContentPlugin markdown={initialMarkdown} autoFocus />
      ) : null}
      {draftKey ? <DraftPlugin draftKey={draftKey} /> : null}
      <EditLastPlugin onRequestEditLast={onRequestEditLast} />
      <PasteMarkdownPlugin />
      <EscapeToCancelPlugin onCancel={onCancel} />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <AutoLinkPlugin matchers={LINK_MATCHERS} />
      <CodeHighlightPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <FormatShortcutsPlugin />
      <EmojiShortcutPlugin />
      <EmojiTypeaheadPlugin menuOpenRef={emojiMenuOpen} />
      <MentionTypeaheadPlugin menuOpenRef={mentionMenuOpen} />
      <TaskMentionTypeaheadPlugin menuOpenRef={taskMentionMenuOpen} />
      <SlashCommandPlugin menuOpenRef={slashMenuOpen} />
      <EnterToSendPlugin
        onSubmit={submit}
        menuOpenRefs={[emojiMenuOpen, slashMenuOpen, mentionMenuOpen, taskMentionMenuOpen]}
      />
      <ExitBlockOnArrowDownPlugin />
    </div>
  );
}

export function MessageComposer({
  disabled,
  placeholder = "Escreva uma mensagem…",
  onSend,
  initialMarkdown,
  onCancel,
  draftKey,
  onRequestEditLast,
}: {
  disabled?: boolean;
  placeholder?: string;
  onSend: (content: string) => Promise<void>;
  /** Conteúdo (markdown) pré-carregado — usado na edição de uma mensagem. */
  initialMarkdown?: string;
  /** Se presente, o composer entra em modo edição (botão cancelar, sem reset). */
  onCancel?: () => void;
  /** Chave do rascunho (canal/DM): preserva texto não enviado ao trocar de alvo. */
  draftKey?: string;
  /** ↑ no campo vazio dispara a edição da última mensagem própria. */
  onRequestEditLast?: () => void;
}) {
  const editMode = Boolean(onCancel);
  const initialConfig = {
    namespace: "kerno-chat",
    theme,
    nodes: [
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      CodeNode,
      CodeHighlightNode,
      MentionNode,
      TaskMentionNode,
    ],
    onError: (error: Error) => {
      console.error("[chat-composer] erro no editor:", error);
    },
  };

  return (
    <div className={editMode ? "" : "border-t p-3"}>
      <LexicalComposer initialConfig={initialConfig}>
        <ComposerInner
          disabled={disabled}
          placeholder={placeholder}
          onSend={onSend}
          initialMarkdown={initialMarkdown}
          onCancel={onCancel}
          resetAfterSend={!editMode}
          draftKey={editMode ? undefined : draftKey}
          onRequestEditLast={editMode ? undefined : onRequestEditLast}
        />
      </LexicalComposer>
      {editMode ? (
        <p className="mt-1 px-1 text-[11px] text-muted-foreground">
          Enter salva · Esc cancela
        </p>
      ) : (
        <p className="mt-1 px-1 text-[11px] text-muted-foreground">
          Enter envia · Shift+Enter quebra linha · / abre comandos · :emoji: vira emoji ·
          Ctrl+Enter envia
        </p>
      )}
    </div>
  );
}
