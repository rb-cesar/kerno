"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/core/auth/require-session";
import { createWorkspaceInputSchema } from "@/modules/workspaces/dto";
import { container } from "@/server/container";

type FormState = { error?: string } | null;

export async function createWorkspaceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireSession();

  const parsed = createWorkspaceInputSchema.safeParse({ name: formData.get("name") });
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
