"use client";

import { createContext, useContext } from "react";
import type {
  CycleDTO,
  KanbanFetchCardDetail,
  KanbanMutate,
  LabelDTO,
  MemberDTO,
  StoryDTO,
} from "../types";

type KanbanContextValue = {
  mutate: KanbanMutate;
  refresh: () => Promise<void> | void;
  fetchCardDetail: KanbanFetchCardDetail;
  currentUserId: string;
  workspaceKey: string;
  members: MemberDTO[];
  labels: LabelDTO[];
  cycles: CycleDTO[];
  stories: StoryDTO[];
  /** Incrementa a cada mudança remota — sinaliza recarregar dados sob demanda (ex.: detalhe do card). */
  remoteRev: number;
  /** Abre o card no dock de abas. `pin` força aba fixada (senão preview). */
  openCard: (cardId: string, opts?: { pin?: boolean }) => void;
  /** Card da aba ativa no dock (p/ destacar o tile correspondente). */
  activeCardId: string | null;
};

const KanbanContext = createContext<KanbanContextValue | null>(null);

export function KanbanProvider({
  value,
  children,
}: {
  value: KanbanContextValue;
  children: React.ReactNode;
}) {
  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>;
}

export function useKanban(): KanbanContextValue {
  const ctx = useContext(KanbanContext);
  if (!ctx) throw new Error("useKanban precisa estar dentro de <KanbanProvider>");
  return ctx;
}
