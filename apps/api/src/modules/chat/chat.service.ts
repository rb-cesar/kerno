import { Injectable } from "@nestjs/common";
import { prisma } from "@kerno/db";
import * as chat from "@kerno/chat/services";
import type {
  ChannelDTO,
  ChatData,
  ChatResult,
  CreateChannelInput,
  DirectConversationDTO,
  MessageDTO,
  OpenDirectInput,
  SendDirectMessageInput,
  SendMessageInput,
} from "@kerno/contracts/chat";
import {
  assertMember,
  guardChannel,
  guardConversation,
  guardProject,
} from "./chat-permissions";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

@Injectable()
export class ChatService {
  /** Carga inicial da tela de chat (antes na page.tsx). */
  async chatForProject(userId: string, projectId: string): Promise<ChatData> {
    await assertMember(userId, projectId);

    const [channels, conversations, projectUsers] = await Promise.all([
      chat.listChannels(projectId),
      chat.listConversations(projectId, userId),
      prisma.projectUser.findMany({
        where: { projectId },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    const initialChannelId = channels[0]?.id ?? null;
    const initialMessages = initialChannelId ? await chat.getMessages(initialChannelId) : [];

    return {
      projectId,
      channels,
      conversations,
      members: projectUsers.map((m) => ({ id: m.user.id, name: m.user.name })),
      initialChannelId,
      initialMessages,
    };
  }

  async fetchMessages(userId: string, channelId: string): Promise<MessageDTO[]> {
    await guardChannel(userId, channelId);
    return chat.getMessages(channelId);
  }

  async sendMessage(userId: string, input: SendMessageInput): Promise<ChatResult<MessageDTO>> {
    try {
      await guardChannel(userId, input.channelId);
      const content = input.content.trim();
      if (!content) return { ok: false, error: "Mensagem vazia" };
      if (content.length > 4000) return { ok: false, error: "Mensagem muito longa" };
      const message = await chat.sendMessage(input.channelId, content, userId);
      return { ok: true, data: message };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async createChannel(userId: string, input: CreateChannelInput): Promise<ChatResult<ChannelDTO>> {
    try {
      await guardProject(userId, input.projectId);
      const name = input.name.trim().toLowerCase().replace(/\s+/g, "-");
      if (!name) return { ok: false, error: "Nome inválido" };
      const channel = await chat.createChannel(input.projectId, name);
      return { ok: true, data: channel };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  // ── Mensagens diretas (DM) ────────────────────────────────────────────────

  /** Abre/recupera a conversa privada com outro membro do projeto. */
  async openDirect(
    userId: string,
    input: OpenDirectInput,
  ): Promise<ChatResult<DirectConversationDTO>> {
    try {
      await guardProject(userId, input.projectId);
      if (input.userId === userId) return { ok: false, error: "Conversa inválida" };
      // O destinatário também precisa ser membro do projeto.
      await assertMember(input.userId, input.projectId);
      const conversation = await chat.openDirect(input.projectId, userId, input.userId);
      return { ok: true, data: conversation };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async directMessages(userId: string, conversationId: string): Promise<MessageDTO[]> {
    await guardConversation(userId, conversationId);
    return chat.getDirectMessages(conversationId);
  }

  async sendDirect(
    userId: string,
    input: SendDirectMessageInput,
  ): Promise<ChatResult<MessageDTO>> {
    try {
      await guardConversation(userId, input.conversationId);
      const content = input.content.trim();
      if (!content) return { ok: false, error: "Mensagem vazia" };
      if (content.length > 4000) return { ok: false, error: "Mensagem muito longa" };
      const message = await chat.sendDirectMessage(input.conversationId, content, userId);
      return { ok: true, data: message };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}
