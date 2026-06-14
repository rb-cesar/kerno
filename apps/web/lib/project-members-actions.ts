"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@kerno/db";
import { requireUser } from "./auth-helpers";
import { getWorkspaceMembership, isProjectManager } from "./permissions";

type Result = { ok: true } | { ok: false; error: string };

const PROJECT_ROLES = ["LEAD", "MEMBER", "VIEWER"] as const;
type ProjectRole = (typeof PROJECT_ROLES)[number];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export async function addProjectMember(input: {
  projectId: string;
  slug: string;
  userId: string;
  role?: ProjectRole;
}): Promise<Result> {
  try {
    const user = await requireUser();
    if (!(await isProjectManager(user.id, input.projectId))) {
      return { ok: false, error: "Sem permissão para gerenciar membros" };
    }

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (!project) return { ok: false, error: "Projeto não encontrado" };

    const isWorkspaceMember = await getWorkspaceMembership(input.userId, project.workspaceId);
    if (!isWorkspaceMember) return { ok: false, error: "Usuário não é membro do workspace" };

    const role: ProjectRole =
      input.role && PROJECT_ROLES.includes(input.role) ? input.role : "MEMBER";

    await prisma.projectUser.upsert({
      where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
      update: { role },
      create: { userId: input.userId, projectId: input.projectId, role },
    });

    revalidatePath(`/w/${input.slug}/p/${input.projectId}`, "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function removeProjectMember(input: {
  projectId: string;
  slug: string;
  userId: string;
}): Promise<Result> {
  try {
    const user = await requireUser();
    if (!(await isProjectManager(user.id, input.projectId))) {
      return { ok: false, error: "Sem permissão para gerenciar membros" };
    }

    const target = await prisma.projectUser.findUnique({
      where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
    });
    if (!target) return { ok: false, error: "Membro não encontrado no projeto" };

    if (target.role === "LEAD") {
      const leadCount = await prisma.projectUser.count({
        where: { projectId: input.projectId, role: "LEAD" },
      });
      if (leadCount <= 1) {
        return { ok: false, error: "O projeto precisa de pelo menos um lead" };
      }
    }

    await prisma.projectUser.delete({
      where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
    });

    revalidatePath(`/w/${input.slug}/p/${input.projectId}`, "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
