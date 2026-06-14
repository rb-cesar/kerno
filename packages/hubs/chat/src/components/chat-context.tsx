"use client";

import { createContext, useContext } from "react";
import type {
  ChatCreateChannel,
  ChatFetchMessages,
  ChatSendMessage,
  MemberDTO,
} from "../types";

type ChatContextValue = {
  send: ChatSendMessage;
  createChannel: ChatCreateChannel;
  fetchMessages: ChatFetchMessages;
  currentUserId: string;
  members: MemberDTO[];
  onlineUserIds: string[];
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
