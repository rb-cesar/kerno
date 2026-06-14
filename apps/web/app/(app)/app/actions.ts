"use server";

import { redirect } from "next/navigation";
import { prisma } from "@kerno/db";
import { requireUser } from "@/lib/auth-helpers";
import { createWorkspaceSchema } from "@/lib/validations";
import { slugify } from "@/lib/slug";

type FormState = { error?: string } | null;

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createWorkspaceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      slug: await uniqueSlug(parsed.data.name),
      users: { create: { userId: user.id, role: "ADMIN" } },
    },
  });

  redirect(`/w/${workspace.slug}`);
}
