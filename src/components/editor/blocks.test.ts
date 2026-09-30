import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseBlocks } from "./blocks";
import { RichTextView } from "./rich-text-view";

describe("parseBlocks", () => {
  it("linhas em branco viram linhas em branco do bloco de texto (não somem)", () => {
    expect(parseBlocks("a\n\n\nb")).toEqual([{ type: "text", lines: ["a", "", "", "b"] }]);
  });

  it("ignora só as bordas em branco do conteúdo", () => {
    expect(parseBlocks("\n\n  \na\n\n")).toEqual([{ type: "text", lines: ["a"] }]);
    expect(parseBlocks("")).toEqual([]);
  });

  it("a linha em branco entre dois blocos é preservada como texto", () => {
    expect(parseBlocks("- a\n\n- b")).toEqual([
      { type: "list", ordered: false, items: [{ text: "a", children: [] }] },
      { type: "text", lines: [""] },
      { type: "list", ordered: false, items: [{ text: "b", children: [] }] },
    ]);
  });

  it("monta listas aninhadas pela indentação (4 espaços do editor, 2 espaços, tab)", () => {
    const expected = [
      {
        type: "list",
        ordered: false,
        items: [
          {
            text: "a",
            children: [{ type: "list", ordered: false, items: [{ text: "b", children: [] }] }],
          },
          { text: "c", children: [] },
        ],
      },
    ];
    expect(parseBlocks("- a\n    - b\n- c")).toEqual(expected);
    expect(parseBlocks("- a\n  - b\n- c")).toEqual(expected);
    expect(parseBlocks("- a\n\t- b\n- c")).toEqual(expected);
  });

  it("lista ordenada dentro de não ordenada, e volta ao nível anterior", () => {
    expect(parseBlocks("- a\n    1. x\n    2. y\n- c")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          {
            text: "a",
            children: [
              {
                type: "list",
                ordered: true,
                items: [
                  { text: "x", children: [] },
                  { text: "y", children: [] },
                ],
              },
            ],
          },
          { text: "c", children: [] },
        ],
      },
    ]);
  });

  it("trocar o tipo de lista no mesmo nível abre uma lista nova", () => {
    const blocks = parseBlocks("- a\n1. b");
    expect(blocks.map((b) => (b.type === "list" ? b.ordered : b.type))).toEqual([false, true]);
  });

  it("código: mantém linhas em branco e indentação; fence sem fechar vai até o fim", () => {
    expect(parseBlocks("```ts\nfoo\n\n  bar\n```")).toEqual([{ type: "code", lang: "ts", code: "foo\n\n  bar" }]);
    expect(parseBlocks("```\nsem fechar")).toEqual([{ type: "code", lang: "", code: "sem fechar" }]);
  });

  it("citação e CRLF", () => {
    expect(parseBlocks("> a\n> b")).toEqual([{ type: "quote", lines: ["a", "b"] }]);
    expect(parseBlocks("a\r\n\r\nb")).toEqual([{ type: "text", lines: ["a", "", "b"] }]);
  });

  it("não trava com indentação irregular", () => {
    expect(() => parseBlocks("    - a\n- b\n        - c\n  - d\n1. e")).not.toThrow();
  });
});

describe("RichTextView", () => {
  const html = (content: string) => renderToStaticMarkup(RichTextView({ content }) as never);

  it("cada linha em branco ocupa uma linha visível", () => {
    const out = html("a\n\n\nb");
    expect(out.match(/<br\/>/g)).toHaveLength(2);
    expect(out.indexOf(">a<")).toBeLessThan(out.indexOf(">b<"));
  });

  it("sem linhas em branco não há <br/> extra", () => {
    expect(html("a\nb")).not.toContain("<br/>");
  });

  it("renderiza lista aninhada como <ul> dentro do <li>", () => {
    const out = html("- a\n    - b\n- c");
    expect(out).toMatch(/<ul[^>]*><li>a<ul[^>]*><li>b<\/li><\/ul><\/li><li>c<\/li><\/ul>/);
  });

  it("desfaz o escape que o editor faz ao salvar (snake_case, 2 * 3, ~)", () => {
    const text = (md: string) => html(md).replace(/<[^>]+>/g, "");
    expect(text("use my\\_var e snake\\_case")).toBe("use my_var e snake_case");
    expect(text("2 \\* 3 = 6 e a \\~ b")).toBe("2 * 3 = 6 e a ~ b");
    expect(text("C:\\dir")).toBe("C:\\dir"); // barra que não escapa nada fica como está
  });

  it("escape não impede a formatação de verdade", () => {
    const out = html("**negrito** e my\\_var");
    expect(out).toContain("<strong>negrito</strong>");
    expect(out).toContain("my_var");
  });

  it("mantém espaços do texto (pre-wrap)", () => {
    expect(html("a    b")).toContain("whitespace-pre-wrap");
    expect(html("a    b")).toContain("a    b");
  });
});
