"use client";

import { Check, Copy, Hash } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { createContext, Fragment, type ReactNode, useContext, useState } from "react";
import { ESCAPED_CHAR, parseBlocks, unescapeMarkdown } from "@/components/editor/blocks";
import { renderBlocks } from "@/components/editor/render-blocks";

// onOpenTask flui por contexto para que as regras inline (estáticas) possam abrir
// a tarefa sem receber o handler por parâmetro em toda a recursão de parsing.
const OpenTaskContext = createContext<((cardId: string, label?: string) => void) | undefined>(undefined);

/** Chip clicável de menção de tarefa (`!task[...]`); abre o painel da tarefa. */
function TaskMentionChip({ cardId, label }: { cardId: string; label: string }) {
  const onOpenTask = useContext(OpenTaskContext);
  return (
    <button
      type="button"
      disabled={!onOpenTask}
      onClick={() => onOpenTask?.(cardId, label)}
      className="rounded bg-amber-500/15 px-1 font-medium text-amber-600 transition-colors hover:bg-amber-500/25 disabled:cursor-default disabled:hover:bg-amber-500/15 dark:text-amber-400"
    >
      <Hash className="mb-0.5 mr-0.5 inline h-3 w-3" />
      {label}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex.: contexto não-seguro) — ignora silenciosamente
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

// Bloco de código com syntax highlighting. prism-react-renderer gera nós React
// (estilos inline por token) — nada de innerHTML, então segue seguro contra XSS.
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {lang || "código"}
        </span>
        <CopyButton text={code} />
      </div>
      <Highlight theme={themes.vsDark} code={code} language={lang || "text"}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre className="overflow-x-auto p-3 font-mono text-[0.85em]" style={style}>
            {tokens.map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: linhas/tokens de highlight, ordem fixa, sem id próprio
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: idem — token dentro da linha
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

// Renderizador de Markdown (subconjunto estilo Discord/Slack), SEM dependências
// e SEM dangerouslySetInnerHTML: tudo vira nó React, então o conteúdo do usuário
// nunca é interpretado como HTML — XSS fica fora de alcance por construção.
//
// Suporta: **negrito**, *itálico* / _itálico_, __sublinhado__, ~~tachado~~,
// `código`, blocos ```código```, > citação, listas (- / 1.) e links
// ([rótulo](url) ou URL solta). Quebras de linha são preservadas.

type InlineRule = {
  regex: RegExp;
  render: (match: RegExpExecArray, children: ReactNode, key: string) => ReactNode;
  recurse: boolean;
};

// Ordem = prioridade. `**` antes de `*`, `__` antes de `_`.
const INLINE_RULES: InlineRule[] = [
  {
    // Caractere escapado pelo editor (`\_`, `\*`…) → o próprio caractere, sem a barra.
    // Primeiro: senão `\*` seria lido como abertura de negrito/itálico.
    regex: ESCAPED_CHAR,
    recurse: false,
    render: (m, _c, key) => <Fragment key={key}>{m[1]}</Fragment>,
  },
  {
    // Menção de tarefa: !task[KERN-12](task:ID) → chip clicável (antes das demais).
    regex: /!task\[([^\]\n]+)\]\(task:([^)\s]+)\)/,
    recurse: false,
    render: (m, _c, key) => <TaskMentionChip key={key} label={m[1] ?? ""} cardId={m[2] ?? ""} />,
  },
  {
    // Menção: @[Nome](user:ID) → chip destacado (não é link — vem antes da regra de link).
    regex: /@\[([^\]\n]+)\]\(user:([^)\s]+)\)/,
    recurse: false,
    render: (m, _c, key) => (
      <span key={key} className="rounded bg-primary/10 px-1 font-medium text-primary">
        @{m[1]}
      </span>
    ),
  },
  {
    regex: /`([^`\n]+)`/,
    recurse: false,
    render: (m, _c, key) => (
      <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
        {m[1]}
      </code>
    ),
  },
  {
    regex: /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/,
    recurse: false,
    render: (m, _c, key) => (
      <a
        key={key}
        href={m[2]}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary underline underline-offset-2"
      >
        {unescapeMarkdown(m[1] ?? "")}
      </a>
    ),
  },
  {
    regex: /\*\*([\s\S]+?)\*\*/,
    recurse: true,
    render: (_m, c, key) => <strong key={key}>{c}</strong>,
  },
  {
    regex: /__([\s\S]+?)__/,
    recurse: true,
    render: (_m, c, key) => <u key={key}>{c}</u>,
  },
  {
    regex: /~~([\s\S]+?)~~/,
    recurse: true,
    render: (_m, c, key) => <del key={key}>{c}</del>,
  },
  {
    regex: /\*([^*\n]+?)\*/,
    recurse: true,
    render: (_m, c, key) => <em key={key}>{c}</em>,
  },
  {
    regex: /(?:^|\s)_([^_\n]+?)_(?=\s|$)/,
    recurse: true,
    render: (m, c, key) => (
      <Fragment key={key}>
        {m[0].startsWith("_") ? null : " "}
        <em>{c}</em>
      </Fragment>
    ),
  },
  {
    regex: /(https?:\/\/[^\s<]+)/,
    recurse: false,
    render: (m, _c, key) => (
      <a
        key={key}
        href={m[1]}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary underline underline-offset-2"
      >
        {m[1]}
      </a>
    ),
  },
];

function parseInline(text: string, keyBase: string): ReactNode[] {
  if (!text) return [];

  let best: { rule: InlineRule; match: RegExpExecArray } | null = null;
  for (const rule of INLINE_RULES) {
    const re = new RegExp(rule.regex.source, "");
    const match = re.exec(text);
    if (match && (best === null || match.index < best.match.index)) {
      best = { rule, match };
    }
  }

  if (!best) return [text];

  const { rule, match } = best;
  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);

  const nodes: ReactNode[] = [];
  if (before) nodes.push(...parseInline(before, `${keyBase}.b`));
  const children = rule.recurse ? parseInline(match[1] ?? "", `${keyBase}.i`) : null;
  nodes.push(rule.render(match, children, `${keyBase}.${match.index}`));
  if (after) nodes.push(...parseInline(after, `${keyBase}.a`));
  return nodes;
}

export function MessageContent({
  content,
  onOpenTask,
}: {
  content: string;
  onOpenTask?: (cardId: string, label?: string) => void;
}): ReactNode {
  return (
    <OpenTaskContext.Provider value={onOpenTask}>
      <div className="text-sm leading-relaxed">
        {renderBlocks(parseBlocks(content), {
          inline: parseInline,
          code: ({ code, lang }) => <CodeBlock code={code} lang={lang} />,
        })}
      </div>
    </OpenTaskContext.Provider>
  );
}
