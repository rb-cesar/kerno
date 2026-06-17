"use client";

import { useCallback, useEffect, useTransition } from "react";
import { Bold, Code, Italic, List, Quote, SendHorizonal, Strikethrough } from "lucide-react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
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
import { $createQuoteNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { CodeNode } from "@lexical/code";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  FORMAT_TEXT_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from "lexical";
import { Button, cn } from "@kerno/ui";

// Subconjunto de transformers — markdown como atalho de digitação (símbolos somem
// ao digitar) e como formato de serialização. Sem headings (é chat).
// Element transformers primeiro, depois os de texto.
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

// Classes do tema = como a formatação aparece AO VIVO no campo (espelha o
// MessageContent que renderiza as mensagens recebidas).
const theme = {
  paragraph: "m-0",
  quote: "border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground",
  list: {
    ul: "list-disc pl-5",
    ol: "list-decimal pl-5",
    listitem: "ml-0",
  },
  code: "block overflow-x-auto rounded-md bg-muted p-2 font-mono text-[0.85em]",
  link: "text-primary underline underline-offset-2",
  text: {
    bold: "font-semibold",
    italic: "italic",
    strikethrough: "line-through",
    code: "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]",
  },
};

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
      // Mantém a seleção do editor ao clicar.
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
  const toggleQuote = () =>
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });

  return (
    <div className="flex items-center gap-0.5 border-b px-1.5 py-1">
      <ToolbarButton title="Negrito" busy={busy} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Itálico" busy={busy} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Tachado"
        busy={busy}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Código" busy={busy} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Lista"
        busy={busy}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Citação" busy={busy} onClick={toggleQuote}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

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

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event && !event.shiftKey) {
          event.preventDefault();
          submit();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, submit]);

  return (
    <div className="rounded-md border focus-within:ring-1 focus-within:ring-ring">
      <Toolbar editor={editor} busy={busy} />
      <div className="flex items-end gap-2 p-2">
        <div className="relative min-w-0 flex-1">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="max-h-40 min-h-[1.5rem] overflow-y-auto px-1 py-1.5 text-sm leading-relaxed outline-none [&_*]:m-0"
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
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
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
    nodes: [QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
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
        Formatação ao vivo: **negrito** · *itálico* · `código` · &gt; citação · - lista · Enter
        envia, Shift+Enter quebra linha
      </p>
    </div>
  );
}
