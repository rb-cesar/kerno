"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { createWorkspaceSchema } from "@/lib/validations";
import { container } from "@/server/container";

type FormState = { error?: string } | null;

export async function createWorkspaceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let slug: string;
  try {
    const result = await container.workspaces.createWorkspace(user.id, { name: parsed.data.name });
    slug = result.slug;
  } catch {
    return { error: "Não foi possível criar o workspace" };
  }

  redirect(`/w/${slug}`);
}
