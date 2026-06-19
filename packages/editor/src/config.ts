// Configuração compartilhada do editor Lexical: subconjunto de transformers de
// markdown (atalhos de digitação + (de)serialização) e tema (como a formatação
// aparece ao vivo no campo). Sem headings (parecido com o chat).

import {
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

export const TRANSFORMERS: Transformer[] = [
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

export const editorTheme = {
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

// Detecta URLs digitadas e as transforma em links automaticamente.
export const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;
