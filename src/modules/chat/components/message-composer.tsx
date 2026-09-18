"use client";

import { $createCodeNode, $isCodeNode, CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  type Transformer,
} from "@lexical/markdown";
import { AutoLinkPlugin, createLinkMatcherWithRegExp } from "@lexical/react/LexicalAutoLinkPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $createQuoteNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  FORMAT_TEXT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_MODIFIER_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
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
import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  type ActiveFormats,
  ActiveFormatsPlugin,
  TRANSFORMERS as BASE_TRANSFORMERS,
  CodeHighlightPlugin,
  EmojiPickerButton,
  EmojiShortcutPlugin,
  EmojiTypeaheadPlugin,
  ExitBlockOnArrowDownPlugin,
  editorTheme,
  MENTION_TRANSFORMER,
  MentionNode,
  MentionTypeaheadPlugin,
  NO_FORMATS,
  PasteMarkdownPlugin,
  SlashCommandPlugin,
  SubmitPlugin,
  TASK_MENTION_TRANSFORMER,
  TaskMentionNode,
  TaskMentionTypeaheadPlugin,
  URL_MATCHER,
} from "@/components/editor";
import { Button, cn } from "@/components/ui";
import { useChat } from "./chat-context";

// Plugins e nós de menção/emoji/comando vêm de @/components/editor (fonte única —
// o kanban usa os mesmos). Aqui ficam só as convenções do chat: Enter envia,
// rascunho por canal, editar a última mensagem, cancelar com Esc.

const TRANSFORMERS: Transformer[] = [
  ...BASE_TRANSFORMERS,
  MENTION_TRANSFORMER,
  TASK_MENTION_TRANSFORMER,
];

const LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) =>
    text.startsWith("http") ? text : `https://${text}`,
  ),
];

// ── Plugins específicos do chat ─────────────────────────────────────────────

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

/** Carrega um markdown inicial no editor (edição) e foca no fim, uma única vez. */
function InitialContentPlugin({ markdown, autoFocus }: { markdown?: string; autoFocus?: boolean }) {
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

// ── Toolbar ──────────────────────────────────────────────────────────────────

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
  const setBlock = (create: () => ReturnType<typeof $createQuoteNode>) =>
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
      <ToolbarButton
        title="Negrito (Ctrl+B)"
        busy={busy}
        active={active.bold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Itálico (Ctrl+I)"
        busy={busy}
        active={active.italic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Tachado (Ctrl+Shift+X)"
        busy={busy}
        active={active.strikethrough}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Código (Ctrl+Shift+C)"
        busy={busy}
        active={active.code}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        title="Lista"
        busy={busy}
        active={active.ul}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Lista numerada"
        busy={busy}
        active={active.ol}
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Citação"
        busy={busy}
        active={active.quote}
        onClick={() => setBlock(() => $createQuoteNode())}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Bloco de código"
        busy={busy}
        active={active.codeblock}
        onClick={toggleCodeBlock}
      >
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
  const { members, currentUserId, searchTasks } = useChat();
  const [editor] = useLexicalComposerContext();
  const [pending, startTransition] = useTransition();
  const busy = Boolean(disabled) || pending;
  const editMode = Boolean(onCancel);
  const emojiMenuOpen = useRef(false);
  const slashMenuOpen = useRef(false);
  const mentionMenuOpen = useRef(false);
  const taskMentionMenuOpen = useRef(false);
  const menuOpenRefs: MutableRefObject<boolean>[] = [
    emojiMenuOpen,
    slashMenuOpen,
    mentionMenuOpen,
    taskMentionMenuOpen,
  ];
  const [active, setActive] = useState<ActiveFormats>(NO_FORMATS);

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

      {editMode ? <InitialContentPlugin markdown={initialMarkdown} autoFocus /> : null}
      {draftKey ? <DraftPlugin draftKey={draftKey} /> : null}
      <EditLastPlugin onRequestEditLast={onRequestEditLast} />
      <PasteMarkdownPlugin transformers={TRANSFORMERS} />
      <EscapeToCancelPlugin onCancel={onCancel} />
      <ActiveFormatsPlugin onChange={setActive} />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <AutoLinkPlugin matchers={LINK_MATCHERS} />
      <CodeHighlightPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <FormatShortcutsPlugin />
      <EmojiShortcutPlugin />
      <EmojiTypeaheadPlugin menuOpenRef={emojiMenuOpen} />
      <MentionTypeaheadPlugin
        members={members}
        currentUserId={currentUserId}
        menuOpenRef={mentionMenuOpen}
      />
      <TaskMentionTypeaheadPlugin search={searchTasks} menuOpenRef={taskMentionMenuOpen} />
      <SlashCommandPlugin menuOpenRef={slashMenuOpen} />
      <SubmitPlugin mode="enter" onSubmit={submit} menuOpenRefs={menuOpenRefs} />
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
    theme: editorTheme,
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
        <p className="mt-1 px-1 text-[11px] text-muted-foreground">Enter salva · Esc cancela</p>
      ) : (
        <p className="mt-1 px-1 text-[11px] text-muted-foreground">
          Enter envia · Shift+Enter quebra linha · / abre comandos · :emoji: vira emoji · Ctrl+Enter
          envia
        </p>
      )}
    </div>
  );
}
