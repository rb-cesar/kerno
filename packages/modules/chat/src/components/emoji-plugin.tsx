"use client";

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useState,
  type MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import { Smile } from "lucide-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  type MenuTextMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createTextNode, $getRoot, $getSelection, $isRangeSelection } from "lexical";
import { cn } from "@kerno/ui";
import { searchEmojis } from "./emoji-data";

// O picker completo (e seu dataset) só é baixado quando o botão é aberto.
const Picker = lazy(() => import("@emoji-mart/react"));

class EmojiOption extends MenuOption {
  constructor(
    public id: string,
    public native: string,
    public name: string,
  ) {
    super(id);
  }
}

/**
 * Autocomplete inline estilo Discord: ":fogo" abre um menu de emojis; selecionar
 * (clique, Enter, Tab) substitui o ":texto" pelo emoji. `menuOpenRef` avisa o
 * EnterToSendPlugin para não enviar enquanto o menu está aberto.
 */
export function EmojiTypeaheadPlugin({
  menuOpenRef,
}: {
  menuOpenRef: MutableRefObject<boolean>;
}) {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const [options, setOptions] = useState<EmojiOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (query === null || query.length < 1) {
      setOptions([]);
      return;
    }
    searchEmojis(query, 8)
      .then((results) => {
        if (!cancelled) {
          setOptions(results.map((e) => new EmojiOption(e.id, e.native, e.name)));
        }
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Mantém o EnterToSend informado de quando o menu está realmente aberto.
  useEffect(() => {
    menuOpenRef.current = query !== null && options.length > 0;
    return () => {
      menuOpenRef.current = false;
    };
  }, [query, options, menuOpenRef]);

  const triggerFn = useCallback((text: string): MenuTextMatch | null => {
    const match = /(?:^|\s)(:[a-zA-Z0-9_+-]+)$/.exec(text);
    if (!match) return null;
    const replaceable = match[1] ?? "";
    const matchingString = replaceable.slice(1);
    if (matchingString.length < 1) return null;
    return {
      leadOffset: match.index + (match[0].length - replaceable.length),
      matchingString,
      replaceableString: replaceable,
    };
  }, []);

  const onSelectOption = useCallback(
    (selectedOption: EmojiOption, nodeToReplace: ReturnType<typeof $createTextNode> | null, closeMenu: () => void) => {
      editor.update(() => {
        if (nodeToReplace) {
          const textNode = $createTextNode(selectedOption.native);
          nodeToReplace.replace(textNode);
          textNode.select();
        }
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<EmojiOption>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorElementRef.current || options.length === 0) return null;
        return createPortal(
          <div className="absolute bottom-full left-0 mb-2 max-h-72 w-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {options.map((option, i) => (
              <button
                key={option.key}
                ref={option.setRefElement}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm",
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
                <span className="text-base">{option.native}</span>
                <span className="truncate text-muted-foreground">:{option.id}:</span>
              </button>
            ))}
          </div>,
          anchorElementRef.current,
        );
      }}
    />
  );
}

/** Botão da toolbar que abre o picker completo (grid com busca/categorias). */
export function EmojiPickerButton({ busy }: { busy: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    if (open && !data) {
      void import("@emoji-mart/data").then((m) => setData(m.default)).catch(() => {});
    }
  }, [open, data]);

  const insert = (native: string) => {
    editor.update(() => {
      let selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        $getRoot().selectEnd();
        selection = $getSelection();
      }
      if ($isRangeSelection(selection)) selection.insertText(native);
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        title="Emoji"
        disabled={busy}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          busy && "pointer-events-none opacity-50",
        )}
      >
        <Smile className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 z-50 mb-2">
            <Suspense
              fallback={
                <div className="rounded-md border bg-popover px-4 py-6 text-sm text-muted-foreground shadow-md">
                  Carregando…
                </div>
              }
            >
              {data ? (
                <Picker
                  data={data}
                  theme="dark"
                  previewPosition="none"
                  skinTonePosition="none"
                  onEmojiSelect={(emoji: { native: string }) => {
                    insert(emoji.native);
                    setOpen(false);
                  }}
                />
              ) : (
                <div className="rounded-md border bg-popover px-4 py-6 text-sm text-muted-foreground shadow-md">
                  Carregando…
                </div>
              )}
            </Suspense>
          </div>
        </>
      ) : null}
    </div>
  );
}
