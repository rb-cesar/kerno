import { prisma } from "@kerno/db";
import { getMessages, listChannels } from "@kerno/chat/services";
import type { ChatData } from "@kerno/chat/types";
import { requireUser } from "@/lib/auth-helpers";
import { assertProjectMember } from "@kerno/workspaces";
import { ChatClient } from "./chat-client";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();
  await assertProjectMember(user.id, projectId);

  const [channels, projectUsers] = await Promise.all([
    listChannels(projectId),
    prisma.projectUser.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const initialChannelId = channels[0]?.id ?? null;
  const initialMessages = initialChannelId ? await getMessages(initialChannelId) : [];

  const initial: ChatData = {
    projectId,
    channels,
    members: projectUsers.map((m) => ({ id: m.user.id, name: m.user.name })),
    initialChannelId,
    initialMessages,
  };

  return <ChatClient initial={initial} currentUserId={user.id} />;
}
