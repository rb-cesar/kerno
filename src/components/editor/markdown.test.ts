import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { QuoteNode } from "@lexical/rich-text";
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from "lexical";
import { describe, expect, it } from "vitest";
import { TRANSFORMERS } from "./config";
import { $exportMarkdown, $importMarkdown } from "./markdown";

// Editor Lexical "headless" (sem DOM): exercita exatamente o import/export que o app usa.

const makeEditor = () =>
  createEditor({
    namespace: "test",
    nodes: [QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, CodeNode, CodeHighlightNode],
    onError: (error) => {
      throw error;
    },
  });

/** markdown → editor → markdown. */
function roundTrip(markdown: string): string {
  const editor = makeEditor();
  editor.update(() => $importMarkdown(markdown, TRANSFORMERS), { discrete: true });
  return editor.getEditorState().read(() => $exportMarkdown(TRANSFORMERS));
}

/** Simula o que o usuário digita: um parágrafo por item ("" = Enter numa linha vazia). */
function typed(paragraphs: string[]): { markdown: string; blocks: string[] } {
  const editor = makeEditor();
  editor.update(
    () => {
      for (const text of paragraphs) {
        const p = $createParagraphNode();
        if (text) p.append($createTextNode(text));
        $getRoot().append(p);
      }
    },
    { discrete: true },
  );
  const markdown = editor.getEditorState().read(() => $exportMarkdown(TRANSFORMERS));

  const reopened = makeEditor();
  reopened.update(() => $importMarkdown(markdown, TRANSFORMERS), { discrete: true });
  const blocks = reopened.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((c) => c.getTextContent()),
  );
  return { markdown, blocks };
}

describe("markdown do editor — espaçamento sobrevive a salvar e reabrir", () => {
  it("mantém várias linhas em branco entre parágrafos (o Lexical padrão colapsa para uma)", () => {
    expect(roundTrip("a\n\n\n\nb")).toBe("a\n\n\n\nb");
  });

  it("Enter em linha vazia: os parágrafos vazios voltam como vazios, na mesma quantidade", () => {
    const { markdown, blocks } = typed(["primeiro", "", "", "segundo", "terceiro"]);
    expect(blocks).toEqual(["primeiro", "", "", "segundo", "terceiro"]);
    expect(roundTrip(markdown)).toBe(markdown); // salvar de novo não muda nada
  });

  it("parágrafos vizinhos (Enter simples) não ganham linha em branco entre eles", () => {
    const { markdown } = typed(["um", "dois"]);
    expect(markdown).toBe("um\ndois");
  });

  it("texto salvo antes da correção (parágrafos separados por linha em branco) reabre e salva igual", () => {
    expect(roundTrip("a\n\nb")).toBe("a\n\nb");
  });

  it("preserva espaços no meio e no início da linha", () => {
    expect(roundTrip("a    b\n  c")).toBe("a    b\n  c");
  });

  it("listas aninhadas (inclusive mistas) não ganham linhas em branco", () => {
    expect(roundTrip("- a\n    - b\n- c")).toBe("- a\n    - b\n- c");
    expect(roundTrip("- a\n    1. x\n    2. y\n- c")).toBe("- a\n    1. x\n    2. y\n- c");
  });

  it("bloco de código mantém linhas em branco e indentação internas", () => {
    const md = "```js\nfoo\n\n  bar\n```";
    expect(roundTrip(md)).toBe(md);
  });

  it("citação, lista e texto juntos", () => {
    const md = "> q1\n> q2\n\n- a\n- b\n\ntexto";
    expect(roundTrip(md)).toBe(md);
  });

  it("normaliza CRLF (texto colado do Windows)", () => {
    expect(roundTrip("a\r\n\r\nb")).toBe("a\n\nb");
  });

  it("não dobra barras invertidas (caminhos do Windows)", () => {
    const { markdown } = typed(["C:\\Users\\cesar"]);
    expect(markdown).toBe("C:\\Users\\cesar");
    expect(roundTrip(markdown)).toBe(markdown);
  });
});
