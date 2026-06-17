"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@kerno/contracts/workspaces";
import { requireUser } from "@/lib/auth-helpers";
import { createProjectSchema, inviteMemberSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";

type FormState = { error?: string; success?: string } | null;

export async function createProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let projectId: string;
  try {
    const res = await apiFetch<{ projectId: string }>(`/workspaces/${workspaceId}/projects`, {
      method: "POST",
      body: JSON.stringify({ name: parsed.data.name, description: parsed.data.description }),
    });
    projectId = res.projectId;
  } catch {
    return { error: "Não foi possível criar o projeto" };
  }

  redirect(`/w/${slug}/p/${projectId}`);
}

export async function inviteMemberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await apiFetch<ActionResult>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify(parsed.data),
  }).catch((): ActionResult => ({ ok: false, error: "Não foi possível convidar o membro" }));

  if (!result.ok) return { error: result.error };

  revalidatePath(`/w/${slug}`);
  return { success: result.message ?? "Membro adicionado ao workspace" };
}
