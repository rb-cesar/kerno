"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@kerno/contracts/workspaces";
import type { ProjectRole } from "@kerno/core/workspaces";
import { apiFetch } from "@/lib/api-client";

export async function addProjectMember(input: {
  projectId: string;
  slug: string;
  userId: string;
  role?: ProjectRole;
}): Promise<ActionResult> {
  const result = await apiFetch<ActionResult>(`/projects/${input.projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId: input.userId, role: input.role }),
  }).catch((): ActionResult => ({ ok: false, error: "Falha ao adicionar membro" }));

  if (result.ok) revalidatePath(`/w/${input.slug}/p/${input.projectId}`, "layout");
  return result;
}

export async function removeProjectMember(input: {
  projectId: string;
  slug: string;
  userId: string;
}): Promise<ActionResult> {
  const result = await apiFetch<ActionResult>(
    `/projects/${input.projectId}/members/${input.userId}`,
    { method: "DELETE" },
  ).catch((): ActionResult => ({ ok: false, error: "Falha ao remover membro" }));

  if (result.ok) revalidatePath(`/w/${input.slug}/p/${input.projectId}`, "layout");
  return result;
}
