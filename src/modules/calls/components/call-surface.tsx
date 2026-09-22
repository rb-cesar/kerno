"use client";

import { ControlBar, LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/components/ui";
import { CallParticipantGrid } from "./call-participant-grid";

/**
 * Superfície única da chamada — a mesma árvore de componentes serve pro painel
 * dentro do chat e pro card minimizado; quem decide o tamanho é o wrapper do
 * portal (calls-provider.tsx), não este componente — aqui só preenche
 * h-full/w-full do que receber.
 *
 * Sem <VideoConference/> (prefab do LiveKit) de propósito — ele embute um chat
 * próprio que competiria com o chat de verdade do kerno. Montamos as peças à
 * mão (grade de participantes + ControlBar) e desligamos o botão de chat da
 * barra padrão pra usar o nosso.
 */
export interface CallChoices {
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

export function CallSurface({
  token,
  choices,
  minimized,
  onLeave,
  onExpandRequest,
  isChatOpen,
  onToggleChat,
}: {
  token: string;
  /** Vem da tela de preparação (PreJoin) — decide o que é publicado ao conectar. */
  choices: CallChoices;
  minimized: boolean;
  onLeave: () => void;
  /** Só relevante minimizado — pede pra navegar de volta ao chat. */
  onExpandRequest?: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL}
      connect
      audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId } : false}
      video={choices.videoEnabled ? { deviceId: choices.videoDeviceId } : false}
      onDisconnected={onLeave}
      data-lk-theme="default"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden border bg-background text-foreground",
        minimized && "rounded-lg shadow-lg",
      )}
    >
      <RoomAudioRenderer />
      <div className="flex items-center border-b px-3 py-2 text-xs">
        {minimized ? (
          <button type="button" onClick={onExpandRequest} className="font-semibold hover:underline">
            Chamada em andamento
          </button>
        ) : (
          <span className="font-semibold">Chamada</span>
        )}
      </div>
      <div className="min-h-0 flex-1 bg-black/90 p-2">
        <CallParticipantGrid />
      </div>
      {/* "minimal" (só ícone): rótulos como "Microphone" não cabem numa coluna
          estreita. O botão de sair é o próprio disconnect da ControlBar (já
          tematizado com --lk-danger) — não duplicamos com um segundo botão
          aqui. Sem "Encerrar p/ todos": a chamada já se encerra sozinha quando
          o último participante sai, não existe mais um papel de "admin". */}
      <div className="flex items-center border-t">
        <div className="flex-1">
          <ControlBar controls={{ chat: false }} saveUserChoices variation="minimal" />
        </div>
        <button
          type="button"
          onClick={onToggleChat}
          title={isChatOpen ? "Ocultar conversa" : "Mostrar conversa"}
          aria-pressed={isChatOpen}
          className={cn(
            "mr-3 flex h-8 w-8 items-center justify-center rounded-lg",
            isChatOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    </LiveKitRoom>
  );
}
