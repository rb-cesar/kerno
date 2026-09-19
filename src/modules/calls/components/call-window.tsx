"use client";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";

/** Janela de chamada — UI de dentro da call é inteira do LiveKit (grid, mute, câmera, screen share). */
export function CallWindow({ token, onDisconnected }: { token: string; onDisconnected: () => void }) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL}
      connect
      onDisconnected={onDisconnected}
      style={{ height: "100%" }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
