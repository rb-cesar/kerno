"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@kerno/db";
import { requireUser } from "@/lib/auth-helpers";
import { assertWorkspaceMember, getWorkspaceMembership } from "@/lib/permissions";
import { createProjectSchema, inviteMemberSchema } from "@/lib/validations";

type FormState = { error?: string; success?: string } | null;

export async function createProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  await assertWorkspaceMember(user.id, workspaceId);

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const description = parsed.data.description?.trim() || null;

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description,
      workspaceId,
      users: { create: { userId: user.id, role: "LEAD" } },
      boards: {
        create: {
          name: "Principal",
          columns: {
            create: [
              { name: "To Do", order: 0 },
              { name: "In Progress", order: 1 },
              { name: "Done", order: 2 },
            ],
          },
        },
      },
      channels: {
        create: { name: "geral", isDefault: true },
      },
    },
  });

  redirect(`/w/${slug}/p/${project.id}`);
}

export async function inviteMemberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const membership = await getWorkspaceMembership(user.id, workspaceId);
  if (!membership) return { error: "Você não tem acesso a este workspace" };
  if (membership.role !== "ADMIN") {
    return { error: "Apenas administradores podem convidar membros" };
  }

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!target) {
    return { error: "Nenhum usuário do Kerno com este e-mail (no MVP, convide quem já tem conta)" };
  }

  const already = await getWorkspaceMembership(target.id, workspaceId);
  if (already) {
    return { error: "Este usuário já é membro do workspace" };
  }

  await prisma.workspaceUser.create({
    data: { userId: target.id, workspaceId, role: parsed.data.role },
  });

  revalidatePath(`/w/${slug}`);
  return { success: `${target.name} adicionado ao workspace` };
}
