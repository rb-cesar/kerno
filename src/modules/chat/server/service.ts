import { prisma } from "@/core/db";
import type {
  ChannelDTO,
  ChatData,
  ChatResult,
  CreateChannelInput,
  DirectConversationDTO,
  EditMessageInput,
  MessageDTO,
  OpenDirectInput,
  SendDirectMessageInput,
  SendMessageInput,
  ToggleReactionInput,
} from "../types";
import { chatDomain } from "./domain";
import { assertMember, guardChannel, guardConversation, guardWorkspace } from "./guards";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export class ChatService {
  /** Carga inicial da tela de chat (antes na page.tsx). */
  async chatForWorkspace(userId: string, workspaceId: string): Promise<ChatData> {
    await assertMember(userId, workspaceId);

    const [channels, conversations, workspaceUsers] = await Promise.all([
      chatDomain.listChannels(workspaceId),
      chatDomain.listConversations(workspaceId, userId),
      prisma.workspaceUser.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    const initialChannelId = channels[0]?.id ?? null;
    const initialMessages = initialChannelId
      ? await chatDomain.getMessages(initialChannelId, userId)
      : [];

    return {
      workspaceId,
      channels,
      conversations,
      members: workspaceUsers.map((m) => ({ id: m.user.id, name: m.user.name })),
      initialChannelId,
      initialMessages,
    };
  }

  async fetchMessages(userId: string, channelId: string): Promise<MessageDTO[]> {
    await guardChannel(userId, channelId);
    return chatDomain.getMessages(channelId, userId);
  }

  async sendMessage(userId: string, input: SendMessageInput): Promise<ChatResult<MessageDTO>> {
    try {
      await guardChannel(userId, input.channelId, "MEMBER");
      const content = input.content.trim();
      if (!content) return { ok: false, error: "Mensagem vazia" };
      if (content.length > 4000) return { ok: false, error: "Mensagem muito longa" };
      const message = await chatDomain.sendMessage(
        input.channelId,
        content,
        userId,
        input.replyToId,
      );
      return { ok: true, data: message };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async editMessage(userId: string, input: EditMessageInput): Promise<ChatResult<MessageDTO>> {
    try {
      const ctx = await chatDomain.messageContext(input.messageId);
      if (!ctx) return { ok: false, error: "Mensagem não encontrada" };

      // Acesso ao canal/conversa da mensagem (a autoria é checada no domínio).
      if (ctx.channelId) await guardChannel(userId, ctx.channelId, "MEMBER");
      else if (ctx.conversationId) await guardConversation(userId, ctx.conversationId);
      else return { ok: false, error: "Mensagem inválida" };

      const content = input.content.trim();
      if (!content) return { ok: false, error: "Mensagem vazia" };
      if (content.length > 4000) return { ok: false, error: "Mensagem muito longa" };

      const message = await chatDomain.editMessage(input.messageId, content, userId);
      return { ok: true, data: message };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async createChannel(userId: string, input: CreateChannelInput): Promise<ChatResult<ChannelDTO>> {
    try {
      await guardWorkspace(userId, input.workspaceId, "MEMBER");
      const name = input.name.trim().toLowerCase().replace(/\s+/g, "-");
      if (!name) return { ok: false, error: "Nome inválido" };
      const channel = await chatDomain.createChannel(input.workspaceId, name);
      return { ok: true, data: channel };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  // ── Mensagens diretas (DM) ────────────────────────────────────────────────

  /** Abre/recupera a conversa privada com outro membro do workspace. */
  async openDirect(
    userId: string,
    input: OpenDirectInput,
  ): Promise<ChatResult<DirectConversationDTO>> {
    try {
      await guardWorkspace(userId, input.workspaceId, "MEMBER");
      if (input.userId === userId) return { ok: false, error: "Conversa inválida" };
      // O destinatário também precisa ser membro do workspace.
      await assertMember(input.userId, input.workspaceId);
      const conversation = await chatDomain.openDirect(input.workspaceId, userId, input.userId);
      return { ok: true, data: conversation };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async directMessages(userId: string, conversationId: string): Promise<MessageDTO[]> {
    await guardConversation(userId, conversationId);
    return chatDomain.getDirectMessages(conversationId, userId);
  }

  async toggleReaction(
    userId: string,
    input: ToggleReactionInput,
  ): Promise<ChatResult<{ messageId: string }>> {
    try {
      const ctx = await chatDomain.messageContext(input.messageId);
      if (!ctx) return { ok: false, error: "Mensagem não encontrada" };

      // Garante que o usuário tem acesso ao canal/conversa da mensagem.
      if (ctx.channelId) await guardChannel(userId, ctx.channelId, "MEMBER");
      else if (ctx.conversationId) await guardConversation(userId, ctx.conversationId);
      else return { ok: false, error: "Mensagem inválida" };

      const emoji = input.emoji?.trim();
      if (!emoji || emoji.length > 16) return { ok: false, error: "Emoji inválido" };

      await chatDomain.toggleReaction(input.messageId, emoji, userId);
      return { ok: true, data: { messageId: input.messageId } };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async sendDirect(userId: string, input: SendDirectMessageInput): Promise<ChatResult<MessageDTO>> {
    try {
      await guardConversation(userId, input.conversationId);
      const content = input.content.trim();
      if (!content) return { ok: false, error: "Mensagem vazia" };
      if (content.length > 4000) return { ok: false, error: "Mensagem muito longa" };
      const message = await chatDomain.sendDirectMessage(
        input.conversationId,
        content,
        userId,
        input.replyToId,
      );
      return { ok: true, data: message };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}

export function createChatService(): ChatService {
  return new ChatService();
}
