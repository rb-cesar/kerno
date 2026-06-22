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
import { cn } from "@kerno/ui";

// Nó de menção genérico (reaproveitável por qualquer campo): mostra "@Nome" e
// carrega o userId; serializa para `@[Nome](user:ID)` no markdown (mesmo formato
// do chat → renderização consistente).

export type SerializedMentionNode = SerializedTextNode & { userId: string };

export class MentionNode extends TextNode {
  __userId: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__userId, node.__text, node.__key);
  }

  constructor(userId: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__userId = userId;
  }

  getUserId(): string {
    return this.__userId;
  }

  getName(): string {
    return this.__text.replace(/^@/, "");
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = "rounded bg-primary/10 px-0.5 font-medium text-primary";
    return dom;
  }

  static importJSON(json: SerializedMentionNode): MentionNode {
    return $createMentionNode(json.userId, json.text.replace(/^@/, ""));
  }

  exportJSON(): SerializedMentionNode {
    return { ...super.exportJSON(), type: "mention", userId: this.__userId };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createMentionNode(userId: string, name: string): MentionNode {
  const node = new MentionNode(userId, `@${name}`);
  node.setMode("token");
  return $applyNodeReplacement(node);
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode;
}

/** Transformer markdown: MentionNode ⇄ `@[Nome](user:ID)`. */
export const MENTION_TRANSFORMER: TextMatchTransformer = {
  dependencies: [MentionNode],
  export: (node) =>
    $isMentionNode(node) ? `@[${node.getName()}](user:${node.getUserId()})` : null,
  importRegExp: /@\[([^\]]+)\]\(user:([^)]+)\)/,
  regExp: /@\[([^\]]+)\]\(user:([^)]+)\)$/,
  replace: (textNode, match) => {
    const [, name, userId] = match;
    textNode.replace($createMentionNode(userId ?? "", name ?? ""));
  },
  trigger: ")",
  type: "text-match",
};

export type MentionMember = { id: string; name: string };

class MentionOption extends MenuOption {
  constructor(
    public id: string,
    public name: string,
  ) {
    super(id);
  }
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Autocomplete inline "@membro" — parametrizado pela lista de membros. */
export function MentionTypeaheadPlugin({
  members,
  currentUserId,
  menuOpenRef,
}: {
  members: MentionMember[];
  currentUserId?: string;
  menuOpenRef?: MutableRefObject<boolean>;
}) {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);

  const options = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members
      .filter((m) => m.id !== currentUserId && m.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((m) => new MentionOption(m.id, m.name));
  }, [query, members, currentUserId]);

  useEffect(() => {
    if (!menuOpenRef) return;
    menuOpenRef.current = query !== null && options.length > 0;
    return () => {
      menuOpenRef.current = false;
    };
  }, [query, options, menuOpenRef]);

  const triggerFn = useCallback((text: string): MenuTextMatch | null => {
    const match = /(?:^|\s)(@[a-zA-ZÀ-ÿ0-9_.-]*)$/.exec(text);
    if (!match) return null;
    const replaceable = match[1] ?? "";
    return {
      leadOffset: match.index + (match[0].length - replaceable.length),
      matchingString: replaceable.slice(1),
      replaceableString: replaceable,
    };
  }, []);

  const onSelectOption = useCallback(
    (selectedOption: MentionOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        const mention = $createMentionNode(selectedOption.id, selectedOption.name);
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
    <LexicalTypeaheadMenuPlugin<MentionOption>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorElementRef.current || options.length === 0) return null;
        return createPortal(
          <div className="absolute bottom-full left-0 mb-2 max-h-72 w-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
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
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium">
                  {initials(option.name)}
                </span>
                <span className="truncate">{option.name}</span>
              </button>
            ))}
          </div>,
          anchorElementRef.current,
        );
      }}
    />
  );
}
