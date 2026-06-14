"use client";

import { createContext, useContext } from "react";
import type { KanbanMutate, LabelDTO, MemberDTO } from "../types";

type KanbanContextValue = {
  mutate: KanbanMutate;
  refresh: () => Promise<void> | void;
  currentUserId: string;
  members: MemberDTO[];
  labels: LabelDTO[];
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
