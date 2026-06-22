"use client";

import { useCallback } from "react";
import { Hash } from "lucide-react";
import { ChatPanel, type ChatData } from "@kerno/chat";
import { TaskSidePanel } from "@kerno/kanban";
import { TabDock, useDockTabs, type DockTab } from "@kerno/ui";
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
  const dock = useDockTabs();

  // Liga a menção `!` à API do kanban (busca por workspace).
  const searchTasks = useCallback(
    (query: string) => kanbanSearchTasks(initial.workspaceId, query),
    [initial.workspaceId],
  );

  const onOpenTask = useCallback(
    (cardId: string, label?: string) => {
      dock.openPreview({
        id: cardId,
        title: label ?? "Tarefa",
        icon: <Hash className="h-3 w-3 shrink-0 text-amber-500" />,
      });
    },
    [dock],
  );

  const renderTab = useCallback(
    (tab: DockTab) => (
      <TaskSidePanel
        key={tab.id}
        cardId={tab.id}
        currentUserId={currentUserId}
        mutate={kanbanMutate}
        fetchCardBoard={kanbanFetchCardBoard}
        fetchSnapshot={kanbanFetch}
        fetchCardDetail={kanbanFetchCardDetail}
        onClose={() => dock.close(tab.id)}
      />
    ),
    [currentUserId, dock],
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
          onOpenTask={onOpenTask}
        />
      </div>
      <TabDock
        tabs={dock.tabs}
        activeId={dock.activeId}
        onActivate={dock.activate}
        onClose={dock.close}
        onPin={dock.pin}
        renderContent={renderTab}
        storageKey="kerno:dock:chat:width"
      />
    </div>
  );
}
