"use client";

import { Fragment, type ReactNode } from "react";

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

/** Linhas de um parágrafo viram texto inline com <br/> entre elas. */
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

export function MessageContent({ content }: { content: string }): ReactNode {
  const lines = content.split("\n");
  const at = (idx: number): string => lines[idx] ?? "";
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = at(i);

    // Bloco de código cercado por ``` .
    if (line.trimStart().startsWith("```")) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !at(i).trimStart().startsWith("```")) {
        code.push(at(i));
        i += 1;
      }
      i += 1; // pula o ``` de fechamento
      blocks.push(
        <pre
          key={`pre.${i}`}
          className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-[0.85em]"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Citação: linhas consecutivas começando com "> ".
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

    // Lista não ordenada (- ou *) / ordenada (1.).
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

    // Linha em branco — separa parágrafos.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Parágrafo: linhas consecutivas "normais".
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
