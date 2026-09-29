import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Peças compartilhadas pelos conjuntos de tools (kanban/workspaces em tools.ts,
// chat em chat-tools.ts).

const ok = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});

const fail = (message: string): CallToolResult => ({ content: [{ type: "text", text: message }], isError: true });

/** Erros de domínio/permissão viram resultado `isError` (o modelo lê a mensagem e reage) — nunca derrubam o servidor. */
export async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export const READ = { readOnlyHint: true, openWorldHint: false } as const;
export const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
export const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const;

export const workspaceSlug = z.string().min(1).describe("Slug do workspace (ex.: kerno-demo) — vem de list_workspaces");
