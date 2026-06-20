"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@kerno/contracts/workspaces";
import type { WorkspaceRole } from "@kerno/core/workspaces";
import { apiFetch } from "@/lib/api-client";

export async function inviteWorkspaceMember(input: {
  workspaceId: string;
  slug: string;
  email: string;
  role: WorkspaceRole;
}): Promise<ActionResult> {
  const result = await apiFetch<ActionResult>(`/workspaces/${input.workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify({ email: input.email, role: input.role }),
  }).catch((): ActionResult => ({ ok: false, error: "Falha ao convidar membro" }));

  if (result.ok) revalidatePath(`/w/${input.slug}`, "layout");
  return result;
}

export async function removeWorkspaceMember(input: {
  workspaceId: string;
  slug: string;
  userId: string;
}): Promise<ActionResult> {
  const result = await apiFetch<ActionResult>(
    `/workspaces/${input.workspaceId}/members/${input.userId}`,
    { method: "DELETE" },
  ).catch((): ActionResult => ({ ok: false, error: "Falha ao remover membro" }));

  if (result.ok) revalidatePath(`/w/${input.slug}`, "layout");
  return result;
}
