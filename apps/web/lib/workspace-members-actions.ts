"use server";

import type { ActionResult, WorkspaceRole } from "@kerno/core/workspaces";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { container } from "@/server/container";

export async function inviteWorkspaceMember(input: {
  workspaceId: string;
  slug: string;
  email: string;
  role: WorkspaceRole;
}): Promise<ActionResult> {
  const user = await requireUser();
  const result = await container.workspaces.invite(user.id, input.workspaceId, {
    email: input.email,
    role: input.role,
  });

  if (result.ok) revalidatePath(`/w/${input.slug}`, "layout");
  return result;
}

export async function removeWorkspaceMember(input: {
  workspaceId: string;
  slug: string;
  userId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const result = await container.workspaces.removeMember(user.id, input.workspaceId, input.userId);

  if (result.ok) revalidatePath(`/w/${input.slug}`, "layout");
  return result;
}
