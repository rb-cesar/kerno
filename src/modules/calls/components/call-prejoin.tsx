"use client";

import type { LocalUserChoices } from "@livekit/components-react";
import { PreJoin } from "@livekit/components-react";

/**
 * Tela de preparação antes de conectar — câmera/mic + seletor de dispositivo,
 * via o prefab do LiveKit. `persistUserChoices` (default do PreJoin) já
 * lembra a última escolha entre chamadas sozinho, via localStorage.
 */
export function CallPreJoin({
  defaultUsername,
  onSubmit,
  onCancel,
}: {
  /** Só preenche o campo de nome do PreJoin (pensado pra convidados sem conta) —
   * a identidade real do participante vem do token, assinado no servidor. */
  defaultUsername: string;
  onSubmit: (choices: LocalUserChoices) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden border bg-background text-foreground">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
        <span className="font-semibold">Entrar na chamada</span>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-destructive hover:underline"
        >
          Cancelar
        </button>
      </div>
      {/* O campo de nome do PreJoin é pra fluxos de convidado sem conta — aqui
          quem entra já está autenticado, então escondemos só o <input> (não o
          form inteiro: o botão "Entrar" mora no mesmo form) e pré-preenchemos
          o valor pra passar na validação padrão do componente (exige não-vazio). */}
      <style>
        {
          ".kerno-prejoin .lk-username-container { justify-content: flex-end; } .kerno-prejoin .lk-username-container input { display: none; }"
        }
      </style>
      <div className="kerno-prejoin min-h-0 flex-1 overflow-auto" data-lk-theme="default">
        <PreJoin
          defaults={{ username: defaultUsername, audioEnabled: true, videoEnabled: false }}
          onSubmit={onSubmit}
          joinLabel="Entrar"
          micLabel="Microfone"
          camLabel="Câmera"
        />
      </div>
    </div>
  );
}
