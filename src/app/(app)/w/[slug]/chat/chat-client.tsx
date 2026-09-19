"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspacePresence } from "@/components/providers/workspace-presence-provider";
import { useWorkspaceDock } from "@/components/shell/workspace-dock-provider";
import { Button } from "@/components/ui";
import { callsClient } from "@/modules/calls/client";
import { CallBanner } from "@/modules/calls/components/call-banner";
import { CallWindow } from "@/modules/calls/components/call-window";
import { useCallsRealtime } from "@/modules/calls/components/use-calls-realtime";
import type { CallDTO } from "@/modules/calls/types";
import { chatClient } from "@/modules/chat/client";
import { ChatPanel } from "@/modules/chat/components/chat-panel";
import type { ChatData } from "@/modules/chat/types";
import { kanbanClient } from "@/modules/kanban/client";

export function ChatClient({ initial, currentUserId }: { initial: ChatData; currentUserId: string }) {
  const { socket } = useSocket();
  const onlineUserIds = useWorkspacePresence();
  const { openCard } = useWorkspaceDock();
  const searchParams = useSearchParams();

  // Deep-link de notificação (?channel=<id> ou ?dm=<id>).
  const initialTarget = useMemo(() => {
    const channelId = searchParams.get("channel");
    const conversationId = searchParams.get("dm");
    if (!channelId && !conversationId) return undefined;
    return { channelId: channelId ?? undefined, conversationId: conversationId ?? undefined };
  }, [searchParams]);

  // Liga a menção `!` à API do kanban (busca por workspace).
  const searchTasks = useCallback(
    (query: string) => kanbanClient.searchTasks(initial.workspaceId, query),
    [initial.workspaceId],
  );

  // Clicar no chip de tarefa abre no dock compartilhado do workspace.
  const onOpenTask = useCallback((cardId: string, label?: string) => openCard(cardId, { title: label }), [openCard]);

  // ── Chamadas ao vivo ────────────────────────────────────────────────────
  const [activeCalls, setActiveCalls] = useState<CallDTO[]>([]);
  const [activeCallJoin, setActiveCallJoin] = useState<{ callId: string; token: string } | null>(null);

  const refreshActiveCalls = useCallback(() => {
    void callsClient.fetchActive(initial.workspaceId).then(setActiveCalls);
  }, [initial.workspaceId]);

  useEffect(() => {
    refreshActiveCalls();
  }, [refreshActiveCalls]);

  useCallsRealtime(socket, currentUserId, refreshActiveCalls);

  const startCall = useCallback(async (target: { channelId?: string; conversationId?: string }) => {
    const res = await callsClient.startCall(target);
    if (!res.ok) return;
    setActiveCallJoin({ callId: res.data.call.id, token: res.data.token });
    setActiveCalls((prev) => [...prev.filter((c) => c.id !== res.data.call.id), res.data.call]);
  }, []);

  const joinCall = useCallback(async (callId: string) => {
    const res = await callsClient.joinCall(callId);
    if (res.ok) setActiveCallJoin({ callId: res.data.call.id, token: res.data.token });
  }, []);

  const leaveCall = useCallback(() => {
    setActiveCallJoin((current) => {
      if (current) void callsClient.leaveCall(current.callId);
      return null;
    });
  }, []);

  const endCall = useCallback(() => {
    setActiveCallJoin((current) => {
      if (current) {
        void callsClient.endCall(current.callId);
        setActiveCalls((prev) => prev.filter((c) => c.id !== current.callId));
      }
      return null;
    });
  }, []);

  const renderCallBanner = useCallback(
    (target: { channelId?: string; conversationId?: string }) => {
      const call = activeCalls.find((c) =>
        target.channelId ? c.channelId === target.channelId : c.conversationId === target.conversationId,
      );
      if (!call || activeCallJoin?.callId === call.id) return null;
      return <CallBanner onJoin={() => joinCall(call.id)} />;
    },
    [activeCalls, activeCallJoin, joinCall],
  );

  const canEndActiveCall = activeCallJoin
    ? activeCalls.find((c) => c.id === activeCallJoin.callId)?.startedBy === currentUserId
    : false;

  return (
    <>
      <ChatPanel
        initial={initial}
        currentUserId={currentUserId}
        onlineUserIds={onlineUserIds}
        socket={socket}
        send={chatClient.sendMessage}
        editMessage={chatClient.editMessage}
        createChannel={chatClient.createChannel}
        fetchMessages={chatClient.fetchMessages}
        openDirect={chatClient.openDirect}
        sendDirect={chatClient.sendDirectMessage}
        fetchDirectMessages={chatClient.fetchDirectMessages}
        toggleReaction={chatClient.toggleReaction}
        searchTasks={searchTasks}
        onOpenTask={onOpenTask}
        initialTarget={initialTarget}
        onStartCall={startCall}
        renderCallBanner={renderCallBanner}
      />
      {activeCallJoin ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-medium">Chamada</span>
            <div className="flex items-center gap-2">
              {canEndActiveCall ? (
                <Button variant="destructive" size="sm" onClick={endCall}>
                  Encerrar para todos
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={leaveCall}>
                Sair
              </Button>
            </div>
          </div>
          <div className="flex-1">
            <CallWindow token={activeCallJoin.token} onDisconnected={leaveCall} />
          </div>
        </div>
      ) : null}
    </>
  );
}
