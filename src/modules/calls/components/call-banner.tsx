"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui";

/** Barra "chamada em andamento" — aparece no topo do canal/DM que tem uma call ativa. */
export function CallBanner({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-emerald-500/10 px-4 py-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
        <Phone className="h-3.5 w-3.5" />
        Chamada em andamento
      </span>
      <Button size="sm" onClick={onJoin}>
        Entrar
      </Button>
    </div>
  );
}
