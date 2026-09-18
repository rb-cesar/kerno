"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/core/auth/require-session";
import { container } from "@/server/container";
import type { WorkspaceRole } from "./server";
import type { ActionResult } from "./types";

export async function inviteWorkspaceMember(input: {
  workspaceId: string;
  slug: string;
  email: string;
  role: WorkspaceRole;
}): Promise<ActionResult> {
  const user = await requireSession();
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
  const user = await requireSession();
  const result = await container.workspaces.removeMember(user.id, input.workspaceId, input.userId);

  if (result.ok) revalidatePath(`/w/${input.slug}`, "layout");
  return result;
}
