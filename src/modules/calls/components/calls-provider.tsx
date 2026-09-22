"use client";

import type { LocalUserChoices } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSocket } from "@/components/providers/socket-provider";
import { callsClient } from "../client";
import type { CallDTO } from "../types";
import { CallPreJoin } from "./call-prejoin";
import { type CallChoices, CallSurface } from "./call-surface";
import { useCallsRealtime } from "./use-calls-realtime";

type CurrentCall = { callId: string; token: string; choices: CallChoices };
type PendingPreJoin =
  | { kind: "start"; target: { channelId?: string; conversationId?: string } }
  | { kind: "join"; callId: string };

/**
 * Acompanha a posição/tamanho do slot registrado pelo chat, ao vivo. Existe
 * pra evitar trocar o `container` do portal (ver comentário no return) — em
 * vez disso, o portal fica sempre no mesmo lugar (`document.body`) e só a
 * posição CSS acompanha o slot, via `position: fixed` + as coordenadas daqui.
 */
function useSlotRect(slotEl: HTMLDivElement | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!slotEl) {
      setRect(null);
      return;
    }
    const update = () => setRect(slotEl.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(slotEl);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [slotEl]);

  return rect;
}

type CallsContextValue = {
  activeCalls: CallDTO[];
  /** Chamada em que EU estou agora (não confundir com `activeCalls`, que é todo mundo). */
  currentCall: CurrentCall | null;
  /** currentCall OU a tela de preparação aberta — pra decidir se o slot do chat deve existir. */
  isCallUiOpen: boolean;
  /** Abre a tela de preparação; só cria a chamada de verdade se o usuário confirmar. */
  requestStartCall: (target: { channelId?: string; conversationId?: string }) => void;
  /** Abre a tela de preparação pra entrar numa chamada já em andamento. */
  requestJoinCall: (callId: string) => void;
  leaveCall: () => void;
  findActiveCall: (target: { channelId?: string; conversationId?: string }) => CallDTO | undefined;
  /** O chat chama isto com o nó onde quer que a superfície da chamada apareça (ou `null` ao desmontar). */
  registerCallSlot: (el: HTMLDivElement | null) => void;
  /** Chat aberto ao lado da chamada — controlado pelo botão de chat na barra de controles da própria chamada. */
  isChatOpen: boolean;
  toggleChat: () => void;
};

const CallsContext = createContext<CallsContextValue | null>(null);

export function useCalls(): CallsContextValue {
  const ctx = useContext(CallsContext);
  if (!ctx) throw new Error("useCalls precisa estar dentro de <CallsProvider>");
  return ctx;
}

/**
 * Dono único do `<LiveKitRoom>` do workspace — monta acima das rotas
 * (Board, Chat, …) pra chamada sobreviver à navegação entre elas. Quando o
 * chat registra um slot (`registerCallSlot`), a superfície da chamada é
 * portada pra dentro dele (painel ao lado das mensagens); sem slot registrado
 * (usuário em outra tela do workspace), cai pra um card fixo no canto.
 */
export function CallsProvider({
  workspaceId,
  currentUserId,
  currentUserName,
  slug,
  children,
}: {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  slug: string;
  children: React.ReactNode;
}) {
  const { socket } = useSocket();
  const router = useRouter();
  const [activeCalls, setActiveCalls] = useState<CallDTO[]>([]);
  const [currentCall, setCurrentCall] = useState<CurrentCall | null>(null);
  const [pendingPreJoin, setPendingPreJoin] = useState<PendingPreJoin | null>(null);
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);
  const slotRect = useSlotRect(slotEl);
  const [isChatOpen, setChatOpen] = useState(false);
  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);

  const refreshActiveCalls = useCallback(() => {
    void callsClient.fetchActive(workspaceId).then(setActiveCalls);
  }, [workspaceId]);

  useEffect(() => {
    refreshActiveCalls();
  }, [refreshActiveCalls]);

  useCallsRealtime(socket, currentUserId, refreshActiveCalls);

  // Só uma chamada por vez — trocar de canal/DM com uma call rolando sai da
  // atual antes de entrar na nova, pra nunca deixar duas conexões penduradas.
  const leaveCurrent = useCallback(() => {
    setCurrentCall((current) => {
      if (current) void callsClient.leaveCall(current.callId);
      return null;
    });
    setChatOpen(false);
  }, []);

  const requestStartCall = useCallback((target: { channelId?: string; conversationId?: string }) => {
    setPendingPreJoin({ kind: "start", target });
  }, []);

  const requestJoinCall = useCallback((callId: string) => {
    setPendingPreJoin({ kind: "join", callId });
  }, []);

  // Só chama a API (cria a call/notifica todo mundo, ou registra o join) depois
  // que o usuário confirma a tela de preparação — cancelar não deixa rastro.
  const confirmPreJoin = useCallback(
    async (choices: LocalUserChoices) => {
      const pending = pendingPreJoin;
      if (!pending) return;
      setPendingPreJoin(null);
      leaveCurrent();

      const callChoices: CallChoices = {
        audioEnabled: choices.audioEnabled,
        videoEnabled: choices.videoEnabled,
        audioDeviceId: choices.audioDeviceId,
        videoDeviceId: choices.videoDeviceId,
      };

      const res = await (pending.kind === "start"
        ? callsClient.startCall(pending.target)
        : callsClient.joinCall(pending.callId));
      if (!res.ok) return;
      setCurrentCall({ callId: res.data.call.id, token: res.data.token, choices: callChoices });
      setActiveCalls((prev) => [...prev.filter((c) => c.id !== res.data.call.id), res.data.call]);
    },
    [pendingPreJoin, leaveCurrent],
  );

  const findActiveCall = useCallback(
    (target: { channelId?: string; conversationId?: string }) =>
      activeCalls.find((c) =>
        target.channelId ? c.channelId === target.channelId : c.conversationId === target.conversationId,
      ),
    [activeCalls],
  );

  const value = useMemo<CallsContextValue>(
    () => ({
      activeCalls,
      currentCall,
      isCallUiOpen: currentCall !== null || pendingPreJoin !== null,
      requestStartCall,
      requestJoinCall,
      leaveCall: leaveCurrent,
      findActiveCall,
      registerCallSlot: setSlotEl,
      isChatOpen,
      toggleChat,
    }),
    [
      activeCalls,
      currentCall,
      pendingPreJoin,
      requestStartCall,
      requestJoinCall,
      leaveCurrent,
      findActiveCall,
      isChatOpen,
      toggleChat,
    ],
  );

  const wrapperStyle: React.CSSProperties = slotRect
    ? {
        position: "fixed",
        top: slotRect.top,
        left: slotRect.left,
        width: slotRect.width,
        height: slotRect.height,
        zIndex: 50,
      }
    : { position: "fixed", bottom: 16, right: 16, width: 288, height: 192, zIndex: 50 };

  return (
    <CallsContext.Provider value={value}>
      {children}
      {/*
       * Portal SEMPRE no mesmo container (document.body) — é isso que faz a
       * conexão sobreviver. Tentamos antes trocar o container do portal entre
       * o slot do chat e uma div de fallback: parecia seguro (React só move o
       * DOM entre containers), mas na prática o <LiveKitRoom> reconectava a
       * cada troca (confirmado nos logs: mesmo roomID, participantID novo).
       * Portal fixo + posição por CSS evita o problema inteiro.
       */}
      {pendingPreJoin
        ? createPortal(
            <div style={wrapperStyle}>
              <CallPreJoin
                defaultUsername={currentUserName}
                onSubmit={confirmPreJoin}
                onCancel={() => setPendingPreJoin(null)}
              />
            </div>,
            document.body,
          )
        : currentCall
          ? createPortal(
              <div style={wrapperStyle}>
                <CallSurface
                  key={currentCall.callId}
                  token={currentCall.token}
                  choices={currentCall.choices}
                  minimized={!slotRect}
                  onLeave={leaveCurrent}
                  onExpandRequest={() => router.push(`/w/${slug}/chat`)}
                  isChatOpen={isChatOpen}
                  onToggleChat={toggleChat}
                />
              </div>,
              document.body,
            )
          : null}
    </CallsContext.Provider>
  );
}
