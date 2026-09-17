"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { Hash } from "lucide-react";
import { TabDock, useDockTabs } from "@kerno/ui";
import { TaskSidePanel, kanbanClient } from "@kerno/kanban";

type WorkspaceDock = {
  /** Abre uma tarefa no dock do workspace. `pin` força aba fixada (senão preview). */
  openCard: (cardId: string, opts?: { title?: string; pin?: boolean }) => void;
  /** Id da tarefa na aba ativa (para destacar o tile correspondente). */
  activeCardId: string | null;
};

const WorkspaceDockContext = createContext<WorkspaceDock | null>(null);

export function useWorkspaceDock(): WorkspaceDock {
  const ctx = useContext(WorkspaceDockContext);
  if (!ctx) throw new Error("useWorkspaceDock precisa estar dentro de <WorkspaceDockProvider>");
  return ctx;
}

/**
 * Dock de abas ÚNICO do workspace, acima das rotas (Board, Chat, …): as abas
 * abertas persistem ao navegar entre as telas. O conteúdo de cada aba é o painel
 * self-contained da tarefa (TaskSidePanel), alimentado pelas actions do kanban.
 */
export function WorkspaceDockProvider({
  currentUserId,
  children,
}: {
  currentUserId: string;
  children: ReactNode;
}) {
  const dock = useDockTabs();

  const openCard = useCallback(
    (cardId: string, opts?: { title?: string; pin?: boolean }) => {
      const tab = {
        id: cardId,
        title: opts?.title ?? "Tarefa",
        icon: <Hash className="h-3 w-3 shrink-0 text-amber-500" />,
      };
      if (opts?.pin) dock.openPinned(tab);
      else dock.openPreview(tab);
    },
    [dock],
  );

  return (
    <WorkspaceDockContext.Provider value={{ openCard, activeCardId: dock.activeId }}>
      <div className="flex h-full">
        <div className="min-w-0 flex-1">{children}</div>
        <TabDock
          tabs={dock.tabs}
          activeId={dock.activeId}
          onActivate={dock.activate}
          onClose={dock.close}
          onPin={dock.pin}
          storageKey="kerno:dock:workspace:width"
          renderContent={(tab) => (
            <TaskSidePanel
              key={tab.id}
              cardId={tab.id}
              currentUserId={currentUserId}
              mutate={kanbanClient.command}
              fetchCardBoard={kanbanClient.cardBoard}
              fetchSnapshot={kanbanClient.snapshot}
              fetchCardDetail={kanbanClient.cardDetail}
              onClose={() => dock.close(tab.id)}
            />
          )}
        />
      </div>
    </WorkspaceDockContext.Provider>
  );
}
