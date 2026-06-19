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
  projectKey: string;
  members: MemberDTO[];
  labels: LabelDTO[];
  cycles: CycleDTO[];
  stories: StoryDTO[];
  /** Card aberto no momento (controlado pelo board p/ a paleta de comandos abrir cards). */
  openCardId: string | null;
  setOpenCardId: (id: string | null) => void;
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
