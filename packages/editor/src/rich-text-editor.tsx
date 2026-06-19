"use client";

import { useEffect } from "react";
import { Bold, Braces, Code, Italic, List, ListOrdered, Quote, Strikethrough } from "lucide-react";
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
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { $createQuoteNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
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
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { cn } from "@kerno/ui";
import { TRANSFORMERS, URL_MATCHER, editorTheme } from "./config";

const LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) =>
    text.startsWith("http") ? text : `https://${text}`,
  ),
];

const EDITOR_NODES = [QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, CodeNode, CodeHighlightNode];

function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerCodeHighlighting(editor), [editor]);
  return null;
}

/** Carrega o markdown inicial uma única vez (montagem). */
function InitialMarkdownPlugin({ markdown }: { markdown: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      if (markdown) $convertFromMarkdownString(markdown, TRANSFORMERS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
  return null;
}

/** Serializa para markdown a cada alteração e propaga via onChange. */
function OnChangeMarkdownPlugin({ onChange }: { onChange: (markdown: string) => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        let markdown = "";
        editorState.read(() => {
          markdown = $convertToMarkdownString(TRANSFORMERS);
        });
        onChange(markdown);
      }),
    [editor, onChange],
  );
  return null;
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: LexicalEditor }) {
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
      <ToolbarButton title="Negrito (Ctrl+B)" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Itálico (Ctrl+I)" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Tachado" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}>
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Código" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton title="Lista" onClick={() => toggleList(false)}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Lista numerada" onClick={() => toggleList(true)}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Citação" onClick={setQuote}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Bloco de código" onClick={toggleCodeBlock}>
        <Braces className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

function EditorInner({
  placeholder,
  minHeightClass,
}: {
  placeholder: string;
  minHeightClass: string;
}) {
  const [editor] = useLexicalComposerContext();
  return (
    <>
      <Toolbar editor={editor} />
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
    </>
  );
}

/**
 * Editor de texto rico genérico (markdown) — reusável por qualquer hub. `value` é
 * o markdown INICIAL (carregado uma vez); edições subsequentes saem por `onChange`
 * (não é totalmente controlado, padrão recomendado do Lexical).
 */
export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Escreva…",
  minHeightClass = "min-h-[5rem]",
}: {
  value?: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeightClass?: string;
}) {
  const initialConfig = {
    namespace: "kerno-editor",
    theme: editorTheme,
    nodes: EDITOR_NODES,
    onError: (error: Error) => console.error("[rich-text-editor] erro:", error),
  };

  return (
    <div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
      <LexicalComposer initialConfig={initialConfig}>
        <EditorInner placeholder={placeholder} minHeightClass={minHeightClass} />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <AutoLinkPlugin matchers={LINK_MATCHERS} />
        <CodeHighlightPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <InitialMarkdownPlugin markdown={value} />
        <OnChangeMarkdownPlugin onChange={onChange} />
      </LexicalComposer>
    </div>
  );
}
