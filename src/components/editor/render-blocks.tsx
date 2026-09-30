import { Fragment, type ReactNode } from "react";
import type { Block, ListBlock } from "./blocks";

// Renderização dos blocos de ./blocks — compartilhada pelo RichTextView e pelo
// MessageContent do chat. Cada um injeta o que é seu: as regras inline (o chat tem menções
// e tarefas) e o bloco de código. Tudo vira nó React (nada de innerHTML).

export type BlockRenderers = {
  inline: (text: string, key: string) => ReactNode[];
  code: (block: { code: string; lang: string }) => ReactNode;
};

/** Uma linha do markdown = uma linha visual; linha em branco mantém a altura de uma linha. */
function Lines({ lines, inline, keyBase }: { lines: string[]; inline: BlockRenderers["inline"]; keyBase: string }) {
  return (
    <>
      {lines.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: linhas do bloco, ordem fixa, sem id próprio
        <div key={i} className="whitespace-pre-wrap break-words">
          {line.trim() === "" ? <br /> : inline(line, `${keyBase}.${i}`)}
        </div>
      ))}
    </>
  );
}

function List({ list, inline, keyBase }: { list: ListBlock; inline: BlockRenderers["inline"]; keyBase: string }) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag className={list.ordered ? "list-decimal pl-5" : "list-disc pl-5"}>
      {list.items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: itens da lista, ordem fixa, sem id próprio
        <li key={i}>
          {inline(item.text, `${keyBase}.${i}`)}
          {item.children.map((child, c) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: sub-listas, ordem fixa, sem id próprio
            <List key={c} list={child} inline={inline} keyBase={`${keyBase}.${i}.${c}`} />
          ))}
        </li>
      ))}
    </Tag>
  );
}

export function renderBlocks(blocks: Block[], { inline, code }: BlockRenderers): ReactNode {
  return blocks.map((block, i) => {
    const key = `b${i}`;
    switch (block.type) {
      case "code":
        return (
          <div key={key} className="my-1">
            {code(block)}
          </div>
        );
      case "quote":
        return (
          <blockquote key={key} className="border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground">
            <Lines lines={block.lines} inline={inline} keyBase={key} />
          </blockquote>
        );
      case "list":
        return <List key={key} list={block} inline={inline} keyBase={key} />;
      default:
        return (
          <Fragment key={key}>
            <Lines lines={block.lines} inline={inline} keyBase={key} />
          </Fragment>
        );
    }
  });
}
