"use client";

import { $createCodeNode, $isCodeNode, CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import {
  $isListNode,
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
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { Bold, Braces, Code, Italic, List, ListOrdered, Quote, Strikethrough } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/components/ui";
import { editorTheme, TRANSFORMERS, URL_MATCHER } from "./config";
import {
  type ActiveFormats,
  ActiveFormatsPlugin,
  CodeHighlightPlugin,
  EmojiShortcutPlugin,
  ExitBlockOnArrowDownPlugin,
  NO_FORMATS,
  PasteMarkdownPlugin,
  SubmitPlugin,
} from "./plugins/behaviors";
import { EmojiPickerButton, EmojiTypeaheadPlugin } from "./plugins/emoji";
import {
  MENTION_TRANSFORMER,
  type MentionMember,
  MentionNode,
  MentionTypeaheadPlugin,
} from "./plugins/mention";
import { SlashCommandPlugin } from "./plugins/slash";
import {
  TASK_MENTION_TRANSFORMER,
  TaskMentionNode,
  TaskMentionTypeaheadPlugin,
  type TaskRef,
} from "./plugins/task-ref";

const LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) =>
    text.startsWith("http") ? text : `https://${text}`,
  ),
];

const BASE_NODES = [
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  CodeNode,
  CodeHighlightNode,
];

/** Carrega o markdown inicial uma única vez (montagem). */
function InitialMarkdownPlugin({
  markdown,
  transformers,
}: {
  markdown: string;
  transformers: Transformer[];
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      if (markdown) $convertFromMarkdownString(markdown, transformers);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
  return null;
}

/** Serializa para markdown a cada alteração e propaga via onChange. */
function OnChangeMarkdownPlugin({
  onChange,
  transformers,
}: {
  onChange: (markdown: string) => void;
  transformers: Transformer[];
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        let markdown = "";
        editorState.read(() => {
          markdown = $convertToMarkdownString(transformers);
        });
        onChange(markdown);
      }),
    [editor, onChange, transformers],
  );
  return null;
}

function ToolbarButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  active,
  showEmoji,
}: {
  editor: LexicalEditor;
  active: ActiveFormats;
  showEmoji?: boolean;
}) {
  const toggleCodeBlock = () =>
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      let node: LexicalNode | null = selection.anchor.getNode();
      while (node) {
        if ($isCodeNode(node)) {
          $setBlocksType(selection, () => $createParagraphNode());
          return;
        }
        node = node.getParent();
      }
      $setBlocksType(selection, () => $createCodeNode());
      const after = $getSelection();
      if ($isRangeSelection(after)) {
        const block = after.anchor.getNode().getTopLevelElement();
        if (block) {
          if (block.getNextSibling() === null) block.insertAfter($createParagraphNode());
          if (block.getPreviousSibling() === null) block.insertBefore($createParagraphNode());
        }
      }
    });

  const setQuote = () =>
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createQuoteNode());
    });

  const toggleList = (ordered: boolean) =>
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        let node: LexicalNode | null = selection.anchor.getNode();
        while (node) {
          if ($isListNode(node)) {
            $setBlocksType(selection, () => $createParagraphNode());
            return;
          }
          node = node.getParent();
        }
      }
      editor.dispatchCommand(
        ordered ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
        undefined,
      );
    });

  return (
    <div className="flex items-center gap-0.5 border-b px-1.5 py-1">
      <ToolbarButton
        title="Negrito (Ctrl+B)"
        active={active.bold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Itálico (Ctrl+I)"
        active={active.italic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Tachado"
        active={active.strikethrough}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Código"
        active={active.code}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton title="Lista" active={active.ul} onClick={() => toggleList(false)}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Lista numerada" active={active.ol} onClick={() => toggleList(true)}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Citação" active={active.quote} onClick={setQuote}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Bloco de código" active={active.codeblock} onClick={toggleCodeBlock}>
        <Braces className="h-3.5 w-3.5" />
      </ToolbarButton>
      {showEmoji ? (
        <>
          <span className="mx-1 h-4 w-px bg-border" />
          <EmojiPickerButton />
        </>
      ) : null}
    </div>
  );
}

function EditorInner({
  placeholder,
  minHeightClass,
  showEmoji,
}: {
  placeholder: string;
  minHeightClass: string;
  showEmoji?: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const [active, setActive] = useState<ActiveFormats>(NO_FORMATS);
  return (
    <>
      <Toolbar editor={editor} active={active} showEmoji={showEmoji} />
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={cn(
                "max-h-80 overflow-y-auto px-2 py-1.5 text-sm leading-relaxed outline-none",
                minHeightClass,
              )}
              aria-label={placeholder}
            />
          }
          placeholder={
            <div className="pointer-events-none absolute left-2 top-1.5 select-none text-sm text-muted-foreground">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <ActiveFormatsPlugin onChange={setActive} />
    </>
  );
}

/**
 * Editor de texto rico genérico (markdown) — reusável por qualquer hub. `value` é
 * o markdown INICIAL (carregado uma vez); edições subsequentes saem por `onChange`.
 *
 * Tratamentos opcionais (paridade com o campo do chat): `mentions` (@membro),
 * `enableEmojiShortcodes` (:smile:), `enablePasteMarkdown` (colar markdown) e
 * `onSubmit` (Ctrl/Cmd+Enter). A toolbar destaca os formatos ativos.
 */
export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Escreva…",
  minHeightClass = "min-h-[5rem]",
  mentions,
  taskRefs,
  enableEmojiShortcodes = false,
  enableEmojiPicker = false,
  enableSlashCommands = false,
  enablePasteMarkdown = false,
  onSubmit,
  submitOn = "mod-enter",
}: {
  value?: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  /** Habilita a menção `@membro` com a lista de membros fornecida. */
  mentions?: { members: MentionMember[]; currentUserId?: string };
  /** Habilita a menção `!tarefa` — `search` é injetada por quem usa o editor. */
  taskRefs?: { search: (query: string) => Promise<TaskRef[]> };
  enableEmojiShortcodes?: boolean;
  /** Botão de emoji na toolbar + autocomplete `:nome:` (picker emoji-mart, lazy). */
  enableEmojiPicker?: boolean;
  /** Menu `/comandos` estilo Notion. */
  enableSlashCommands?: boolean;
  enablePasteMarkdown?: boolean;
  /** Dispara isto ao enviar — ver `submitOn`. */
  onSubmit?: () => void;
  /** `"mod-enter"` (default): só Ctrl/Cmd+Enter envia. `"enter"`: Enter envia,
   * Shift+Enter quebra linha (convenção de chat). */
  submitOn?: "enter" | "mod-enter";
}) {
  const transformers = useMemo(() => {
    const extra = [
      ...(mentions ? [MENTION_TRANSFORMER] : []),
      ...(taskRefs ? [TASK_MENTION_TRANSFORMER] : []),
    ];
    return extra.length > 0 ? [...TRANSFORMERS, ...extra] : TRANSFORMERS;
  }, [mentions, taskRefs]);

  const initialConfig = {
    namespace: "kerno-editor",
    theme: editorTheme,
    nodes: [
      ...BASE_NODES,
      ...(mentions ? [MentionNode] : []),
      ...(taskRefs ? [TaskMentionNode] : []),
    ],
    onError: (error: Error) => console.error("[rich-text-editor] erro:", error),
  };

  return (
    <div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
      <LexicalComposer initialConfig={initialConfig}>
        <EditorInner
          placeholder={placeholder}
          minHeightClass={minHeightClass}
          showEmoji={enableEmojiPicker}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <AutoLinkPlugin matchers={LINK_MATCHERS} />
        <CodeHighlightPlugin />
        <MarkdownShortcutPlugin transformers={transformers} />
        <InitialMarkdownPlugin markdown={value} transformers={transformers} />
        <OnChangeMarkdownPlugin onChange={onChange} transformers={transformers} />
        <ExitBlockOnArrowDownPlugin />
        {mentions ? (
          <MentionTypeaheadPlugin
            members={mentions.members}
            currentUserId={mentions.currentUserId}
          />
        ) : null}
        {taskRefs ? <TaskMentionTypeaheadPlugin search={taskRefs.search} /> : null}
        {enableEmojiShortcodes ? <EmojiShortcutPlugin /> : null}
        {enableEmojiPicker ? <EmojiTypeaheadPlugin /> : null}
        {enableSlashCommands ? <SlashCommandPlugin /> : null}
        {enablePasteMarkdown ? <PasteMarkdownPlugin transformers={transformers} /> : null}
        {onSubmit ? <SubmitPlugin mode={submitOn} onSubmit={onSubmit} /> : null}
      </LexicalComposer>
    </div>
  );
}
