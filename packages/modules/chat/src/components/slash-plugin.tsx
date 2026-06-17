"use client";

import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Braces,
  Code,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  type LucideIcon,
} from "lucide-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  type MenuTextMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $setBlocksType } from "@lexical/selection";
import { $createQuoteNode } from "@lexical/rich-text";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { $createCodeNode } from "@lexical/code";
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type TextFormatType,
} from "lexical";
import { cn } from "@kerno/ui";

function applyFormat(editor: LexicalEditor, format: TextFormatType) {
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
}

function applyBlock(editor: LexicalEditor, create: () => ReturnType<typeof $createQuoteNode>) {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) $setBlocksType(selection, create);
  });
}

function applyCodeBlock(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
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
}

type SlashCommand = {
  key: string;
  title: string;
  keywords: string[];
  Icon: LucideIcon;
  run: (editor: LexicalEditor) => void;
};

const COMMANDS: SlashCommand[] = [
  { key: "bold", title: "Negrito", keywords: ["negrito", "bold", "b"], Icon: Bold, run: (e) => applyFormat(e, "bold") },
  { key: "italic", title: "Itálico", keywords: ["italico", "italic", "i"], Icon: Italic, run: (e) => applyFormat(e, "italic") },
  { key: "strike", title: "Tachado", keywords: ["tachado", "strike", "riscado"], Icon: Strikethrough, run: (e) => applyFormat(e, "strikethrough") },
  { key: "code", title: "Código", keywords: ["codigo", "code", "inline"], Icon: Code, run: (e) => applyFormat(e, "code") },
  { key: "ul", title: "Lista", keywords: ["lista", "bullet", "list"], Icon: List, run: (e) => e.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined) },
  { key: "ol", title: "Lista numerada", keywords: ["lista", "numerada", "ordered", "numero"], Icon: ListOrdered, run: (e) => e.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined) },
  { key: "quote", title: "Citação", keywords: ["citacao", "quote", "citar"], Icon: Quote, run: (e) => applyBlock(e, () => $createQuoteNode()) },
  { key: "codeblock", title: "Bloco de código", keywords: ["bloco", "codigo", "code", "codeblock"], Icon: Braces, run: applyCodeBlock },
];

class SlashOption extends MenuOption {
  constructor(public command: SlashCommand) {
    super(command.key);
  }
}

/**
 * Menu de comandos estilo Notion, disparado por "/" NO INÍCIO da linha (evita
 * acionar com "/" digitado sem intenção no meio do texto, URLs etc.). Selecionar
 * remove o "/texto" e aplica a ferramenta. `menuOpenRef` avisa o EnterToSendPlugin.
 */
export function SlashCommandPlugin({ menuOpenRef }: { menuOpenRef: MutableRefObject<boolean> }) {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);

  const options = useMemo(() => {
    const q = (query ?? "").toLowerCase();
    return COMMANDS.filter(
      (c) =>
        q === "" ||
        c.title.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q)),
    ).map((c) => new SlashOption(c));
  }, [query]);

  useEffect(() => {
    menuOpenRef.current = query !== null && options.length > 0;
    return () => {
      menuOpenRef.current = false;
    };
  }, [query, options, menuOpenRef]);

  // Só dispara quando "/" é o primeiro caractere do nó de texto atual.
  const triggerFn = useCallback((text: string): MenuTextMatch | null => {
    const match = /^\/([a-zA-Z]*)$/.exec(text);
    if (!match) return null;
    return { leadOffset: 0, matchingString: match[1] ?? "", replaceableString: match[0] };
  }, []);

  const onSelectOption = useCallback(
    (selectedOption: SlashOption, nodeToReplace: ReturnType<typeof $createTextNode> | null, closeMenu: () => void) => {
      editor.update(() => {
        if (nodeToReplace) {
          const empty = $createTextNode("");
          nodeToReplace.replace(empty);
          empty.select();
        }
        closeMenu();
      });
      selectedOption.command.run(editor);
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorElementRef.current || options.length === 0) return null;
        return createPortal(
          <div className="mt-6 w-56 overflow-hidden rounded-md border bg-popover p-1 shadow-md">
            {options.map((option, i) => {
              const Icon = option.command.Icon;
              return (
                <button
                  key={option.key}
                  ref={option.setRefElement}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
                    i === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground",
                  )}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setHighlightedIndex(i);
                    selectOptionAndCleanUp(option);
                  }}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {option.command.title}
                </button>
              );
            })}
          </div>,
          anchorElementRef.current,
        );
      }}
    />
  );
}
