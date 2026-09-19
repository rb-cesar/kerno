"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { callsClient } from "@/modules/calls/client";
import { CallWindow } from "@/modules/calls/components/call-window";

export function CallsTestClient({ channelId, currentUserId }: { channelId: string; currentUserId: string }) {
  const [join, setJoin] = useState<{ callId: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    const res = await callsClient.startCall({ channelId });
    if (res.ok) setJoin({ callId: res.data.call.id, token: res.data.token });
    else setError(res.error);
  };

  if (join) {
    return (
      <div className="h-screen">
        <CallWindow token={join.token} onDisconnected={() => setJoin(null)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground">Usuário: {currentUserId}</p>
      <p className="text-sm text-muted-foreground">Canal: {channelId}</p>
      <Button onClick={start}>Iniciar/Entrar na chamada</Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
