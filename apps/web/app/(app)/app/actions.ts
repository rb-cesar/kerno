"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { createWorkspaceSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";

type FormState = { error?: string } | null;

export async function createWorkspaceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let slug: string;
  try {
    const res = await apiFetch<{ slug: string }>("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: parsed.data.name }),
    });
    slug = res.slug;
  } catch {
    return { error: "Não foi possível criar o workspace" };
  }

  redirect(`/w/${slug}`);
}
