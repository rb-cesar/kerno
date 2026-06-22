"use client";

import { useCallback, useState } from "react";
import { ChatPanel, type ChatData } from "@kerno/chat";
import { TaskSidePanel } from "@kerno/kanban";
import { useSocket } from "@/components/providers/socket-provider";
import {
  kanbanFetch,
  kanbanFetchCardBoard,
  kanbanFetchCardDetail,
  kanbanMutate,
  kanbanSearchTasks,
} from "../boards/actions";
import {
  chatCreateChannel,
  chatEditMessage,
  chatFetchDirectMessages,
  chatFetchMessages,
  chatOpenDirect,
  chatSendDirectMessage,
  chatSendMessage,
  chatToggleReaction,
} from "./actions";

export function ChatClient({
  initial,
  currentUserId,
}: {
  initial: ChatData;
  currentUserId: string;
}) {
  const { socket, onlineUserIds } = useSocket();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // Liga a menção `!` à API do kanban (busca por workspace).
  const searchTasks = useCallback(
    (query: string) => kanbanSearchTasks(initial.workspaceId, query),
    [initial.workspaceId],
  );

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1">
        <ChatPanel
          initial={initial}
          currentUserId={currentUserId}
          onlineUserIds={onlineUserIds}
          socket={socket}
          send={chatSendMessage}
          editMessage={chatEditMessage}
          createChannel={chatCreateChannel}
          fetchMessages={chatFetchMessages}
          openDirect={chatOpenDirect}
          sendDirect={chatSendDirectMessage}
          fetchDirectMessages={chatFetchDirectMessages}
          toggleReaction={chatToggleReaction}
          searchTasks={searchTasks}
          onOpenTask={setOpenTaskId}
        />
      </div>
      {openTaskId ? (
        <TaskSidePanel
          key={openTaskId}
          cardId={openTaskId}
          currentUserId={currentUserId}
          mutate={kanbanMutate}
          fetchCardBoard={kanbanFetchCardBoard}
          fetchSnapshot={kanbanFetch}
          fetchCardDetail={kanbanFetchCardDetail}
          onClose={() => setOpenTaskId(null)}
        />
      ) : null}
    </div>
  );
}
