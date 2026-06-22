"use client";

import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  type MenuTextMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import type { TextMatchTransformer } from "@lexical/markdown";
import {
  $applyNodeReplacement,
  $createTextNode,
  TextNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
} from "lexical";
import { Hash } from "lucide-react";
import { cn } from "@kerno/ui";
import type { TaskRefDTO } from "../types";
import { useChat } from "./chat-context";

// ── Nó de menção de tarefa ──────────────────────────────────────────────────
// Token atômico que mostra "KERN-12" no editor e carrega o cardId. Serializa para
// `!task[KERN-12](task:ID)` no markdown — a referência sobrevive ao wire/banco e é
// re-hidratada na edição (mesmo padrão da menção de membro).

export type SerializedTaskMentionNode = SerializedTextNode & { cardId: string };

export class TaskMentionNode extends TextNode {
  __cardId: string;

  static getType(): string {
    return "task-mention";
  }

  static clone(node: TaskMentionNode): TaskMentionNode {
    return new TaskMentionNode(node.__cardId, node.__text, node.__key);
  }

  constructor(cardId: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__cardId = cardId;
  }

  getCardId(): string {
    return this.__cardId;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = "rounded bg-amber-500/15 px-1 font-medium text-amber-600 dark:text-amber-400";
    return dom;
  }

  static importJSON(json: SerializedTaskMentionNode): TaskMentionNode {
    return $createTaskMentionNode(json.cardId, json.text);
  }

  exportJSON(): SerializedTaskMentionNode {
    return { ...super.exportJSON(), type: "task-mention", cardId: this.__cardId };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createTaskMentionNode(cardId: string, label: string): TaskMentionNode {
  const node = new TaskMentionNode(cardId, label);
  node.setMode("token");
  return $applyNodeReplacement(node);
}

export function $isTaskMentionNode(
  node: LexicalNode | null | undefined,
): node is TaskMentionNode {
  return node instanceof TaskMentionNode;
}

/** Transformer markdown: TaskMentionNode ⇄ `!task[KERN-12](task:ID)`. */
export const TASK_MENTION_TRANSFORMER: TextMatchTransformer = {
  dependencies: [TaskMentionNode],
  export: (node) =>
    $isTaskMentionNode(node)
      ? `!task[${node.getTextContent()}](task:${node.getCardId()})`
      : null,
  importRegExp: /!task\[([^\]]+)\]\(task:([^)]+)\)/,
  regExp: /!task\[([^\]]+)\]\(task:([^)]+)\)$/,
  replace: (textNode, match) => {
    const [, label, cardId] = match;
    textNode.replace($createTaskMentionNode(cardId ?? "", label ?? ""));
  },
  trigger: ")",
  type: "text-match",
};

// ── Typeahead "!tarefa" ──────────────────────────────────────────────────────

class TaskOption extends MenuOption {
  constructor(
    public cardId: string,
    public label: string,
    public title: string,
  ) {
    super(cardId);
  }
}

/**
 * Autocomplete inline: "!auth" busca tarefas (KERN-N / título) via `searchTasks`
 * do contexto; selecionar insere um TaskMentionNode. Se `searchTasks` não foi
 * injetado (kanban indisponível), o menu nunca abre.
 */
export function TaskMentionTypeaheadPlugin({
  menuOpenRef,
}: {
  menuOpenRef: MutableRefObject<boolean>;
}) {
  const [editor] = useLexicalComposerContext();
  const { searchTasks } = useChat();
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<TaskRefDTO[]>([]);

  useEffect(() => {
    if (query === null || !searchTasks) {
      setResults([]);
      return;
    }
    let active = true;
    void searchTasks(query).then((tasks) => {
      if (active) setResults(tasks);
    });
    return () => {
      active = false;
    };
  }, [query, searchTasks]);

  const options = useMemo(
    () =>
      results
        .slice(0, 8)
        .map((t) => new TaskOption(t.id, `${t.workspaceKey}-${t.number}`, t.title)),
    [results],
  );

  useEffect(() => {
    menuOpenRef.current = query !== null && options.length > 0;
    return () => {
      menuOpenRef.current = false;
    };
  }, [query, options, menuOpenRef]);

  const triggerFn = useCallback(
    (text: string): MenuTextMatch | null => {
      if (!searchTasks) return null;
      const match = /(?:^|\s)(![a-zA-ZÀ-ÿ0-9_.-]*)$/.exec(text);
      if (!match) return null;
      const replaceable = match[1] ?? "";
      return {
        leadOffset: match.index + (match[0].length - replaceable.length),
        matchingString: replaceable.slice(1),
        replaceableString: replaceable,
      };
    },
    [searchTasks],
  );

  const onSelectOption = useCallback(
    (selectedOption: TaskOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        const mention = $createTaskMentionNode(selectedOption.cardId, selectedOption.label);
        if (nodeToReplace) nodeToReplace.replace(mention);
        const space = $createTextNode(" ");
        mention.insertAfter(space);
        space.select();
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<TaskOption>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorElementRef.current || options.length === 0) return null;
        return createPortal(
          <div className="absolute bottom-full left-0 mb-2 max-h-72 w-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {options.map((option, i) => (
              <button
                key={option.key}
                ref={option.setRefElement}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm",
                  i === selectedIndex ? "bg-accent text-accent-foreground" : "text-foreground",
                )}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setHighlightedIndex(i);
                  selectOptionAndCleanUp(option);
                }}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {option.label}
                </span>
                <span className="truncate">{option.title}</span>
              </button>
            ))}
          </div>,
          anchorElementRef.current,
        );
      }}
    />
  );
}
