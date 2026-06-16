import { projectIdOfChannel } from "@kerno/chat/services";
import { requireUser } from "./auth-helpers";
import { assertProjectMember } from "@kerno/core/workspaces";

async function guard(projectId: string | null) {
  const user = await requireUser();
  if (!projectId) throw new Error("Canal não encontrado");
  await assertProjectMember(user.id, projectId);
  return user;
}

export const guardChannel = async (channelId: string) => guard(await projectIdOfChannel(channelId));
export const guardProject = async (projectId: string) => guard(projectId);
