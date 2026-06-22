"use client";

import { createContext, useContext } from "react";
import type {
  ChatCreateChannel,
  ChatFetchDirectMessages,
  ChatFetchMessages,
  ChatOpenDirect,
  ChatSearchTasks,
  ChatSendDirectMessage,
  ChatSendMessage,
  MemberDTO,
} from "../types";

type ChatContextValue = {
  send: ChatSendMessage;
  createChannel: ChatCreateChannel;
  fetchMessages: ChatFetchMessages;
  openDirect: ChatOpenDirect;
  sendDirect: ChatSendDirectMessage;
  fetchDirectMessages: ChatFetchDirectMessages;
  currentUserId: string;
  members: MemberDTO[];
  onlineUserIds: string[];
  /** Busca tarefas p/ a menção `!` (opcional — só quando o kanban está disponível). */
  searchTasks?: ChatSearchTasks;
  /** Abre o painel de uma tarefa mencionada (opcional). */
  onOpenTask?: (cardId: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  value,
  children,
}: {
  value: ChatContextValue;
  children: React.ReactNode;
}) {
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat precisa estar dentro de <ChatProvider>");
  return ctx;
}
