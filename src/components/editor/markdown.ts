import { $convertFromMarkdownString, $convertToMarkdownString, type Transformer } from "@lexical/markdown";

// Ponto único de (des)serialização de markdown do editor — todo import/export do app
// (campo do card, comentários, composer do chat, rascunho, edição de mensagem, colar)
// passa por aqui, sempre com as MESMAS opções.
//
// `shouldPreserveNewLines`: cada linha do markdown é um bloco do editor e linha vazia
// é um parágrafo vazio. O padrão do Lexical trata linha vazia como mero separador de
// parágrafos: descarta os parágrafos vazios na importação (e, na exportação, injeta um
// "\n\n" entre parágrafos vizinhos) — então o espaçamento digitado encolhia toda vez
// que o texto era salvo e reaberto, e listas aninhadas ganhavam linhas em branco. As duas
// pontas precisam usar a mesma opção, senão o texto muda a cada ida e volta.

/** Substitui o conteúdo do editor pelo markdown. Chamar dentro de `editor.update`. */
export function $importMarkdown(markdown: string, transformers: Transformer[]): void {
  $convertFromMarkdownString(markdown.replace(/\r\n?/g, "\n"), transformers, undefined, true);
}

/** Serializa o conteúdo do editor. Chamar dentro de `editorState.read` / `editor.update`. */
export function $exportMarkdown(transformers: Transformer[]): string {
  return $convertToMarkdownString(transformers, undefined, true);
}
