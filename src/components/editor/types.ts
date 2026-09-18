// Tipos puros do editor (sem JSX) — importáveis por processos que não compilam
// .tsx, como o backend. A implementação do plugin de menção `!tarefa` vive em
// `plugins/task-ref.tsx`, que reexporta este tipo.

/** Referência de tarefa devolvida pela busca `!` (menção de tarefa). */
export type TaskRef = { id: string; number: number; title: string; workspaceKey: string };
