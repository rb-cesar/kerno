// Contratos do Hub Chat — compartilhados entre services (server) e UI (client).

export interface MemberDTO {
  id: string;
  name: string;
}

export interface ChannelDTO {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface MessageDTO {
  id: string;
  content: string;
  createdAt: string; // ISO
  isSystem: boolean;
  author: MemberDTO | null;
}

export interface ChatData {
  projectId: string;
  channels: ChannelDTO[];
  members: MemberDTO[];
  initialChannelId: string | null;
  initialMessages: MessageDTO[];
}

export type ChatResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Server actions injetadas pelo app no componente do hub. */
export type ChatSendMessage = (input: {
  channelId: string;
  content: string;
}) => Promise<ChatResult<MessageDTO>>;

export type ChatCreateChannel = (input: {
  projectId: string;
  name: string;
}) => Promise<ChatResult<ChannelDTO>>;

export type ChatFetchMessages = (channelId: string) => Promise<MessageDTO[]>;
