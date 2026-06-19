"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { Check, Copy } from "lucide-react";

// Renderizador de Markdown (subconjunto estilo Discord/Slack), SEM dependências
// pesadas e SEM dangerouslySetInnerHTML: tudo vira nó React, então o conteúdo do
// usuário nunca é interpretado como HTML — XSS fica fora de alcance por construção.
// Genérico (sem menções) — reusado por qualquer hub. O hub Chat tem o seu próprio
// (com menções) até migrar para este.

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível — ignora
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
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
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

type InlineRule = {
  regex: RegExp;
  render: (match: RegExpExecArray, children: ReactNode, key: string) => ReactNode;
  recurse: boolean;
};

const INLINE_RULES: InlineRule[] = [
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
        {m[1]}
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

function renderParagraph(lines: string[], key: string): ReactNode {
  return (
    <p key={key} className="whitespace-pre-wrap break-words">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? <br /> : null}
          {parseInline(line, `${key}.${i}`)}
        </Fragment>
      ))}
    </p>
  );
}

const UNORDERED = /^\s*[-*]\s+/;
const ORDERED = /^\s*\d+\.\s+/;

export function RichTextView({ content }: { content: string }): ReactNode {
  const lines = content.split("\n");
  const at = (idx: number): string => lines[idx] ?? "";
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = at(i);

    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !at(i).trimStart().startsWith("```")) {
        code.push(at(i));
        i += 1;
      }
      i += 1;
      blocks.push(<CodeBlock key={`pre.${i}`} code={code.join("\n")} lang={lang} />);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(at(i))) {
        quote.push(at(i).replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`q.${i}`}
          className="border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground"
        >
          {renderParagraph(quote, `q.${i}.p`)}
        </blockquote>,
      );
      continue;
    }

    if (UNORDERED.test(line) || ORDERED.test(line)) {
      const isOrdered = ORDERED.test(line);
      const marker = isOrdered ? ORDERED : UNORDERED;
      const items: string[] = [];
      while (i < lines.length && marker.test(at(i))) {
        items.push(at(i).replace(marker, ""));
        i += 1;
      }
      const listClass = isOrdered ? "list-decimal" : "list-disc";
      const ListTag = isOrdered ? "ol" : "ul";
      blocks.push(
        <ListTag key={`l.${i}`} className={`${listClass} space-y-0.5 pl-5`}>
          {items.map((item, idx) => (
            <li key={idx}>{parseInline(item, `l.${i}.${idx}`)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      at(i).trim() !== "" &&
      !at(i).trimStart().startsWith("```") &&
      !/^\s*>\s?/.test(at(i)) &&
      !UNORDERED.test(at(i)) &&
      !ORDERED.test(at(i))
    ) {
      para.push(at(i));
      i += 1;
    }
    blocks.push(renderParagraph(para, `p.${i}`));
  }

  return <div className="space-y-2 text-sm leading-relaxed">{blocks}</div>;
}
