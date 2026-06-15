"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth-helpers";
import { isProjectManager } from "@kerno/workspaces";
import {
  addProjectMember as addProjectMemberService,
  removeProjectMember as removeProjectMemberService,
  type ProjectRole,
} from "@kerno/workspaces";

type Result = { ok: true } | { ok: false; error: string };

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

    await addProjectMemberService({
      projectId: input.projectId,
      userId: input.userId,
      role: input.role,
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

    await removeProjectMemberService({
      projectId: input.projectId,
      userId: input.userId,
    });

    revalidatePath(`/w/${input.slug}/p/${input.projectId}`, "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
