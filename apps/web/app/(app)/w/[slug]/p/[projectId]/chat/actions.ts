"use server";

import * as chat from "@kerno/hub-chat/services";
import type { ChannelDTO, ChatResult, MessageDTO } from "@kerno/hub-chat/types";
import { guardChannel, guardProject } from "@/lib/chat-guard";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export async function chatFetchMessages(channelId: string): Promise<MessageDTO[]> {
  await guardChannel(channelId);
  return chat.getMessages(channelId);
}

export async function chatSendMessage(input: {
  channelId: string;
  content: string;
}): Promise<ChatResult<MessageDTO>> {
  try {
    const user = await guardChannel(input.channelId);
    const content = input.content.trim();
    if (!content) return { ok: false, error: "Mensagem vazia" };
    if (content.length > 4000) return { ok: false, error: "Mensagem muito longa" };
    const message = await chat.sendMessage(input.channelId, content, user.id);
    return { ok: true, data: message };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function chatCreateChannel(input: {
  projectId: string;
  name: string;
}): Promise<ChatResult<ChannelDTO>> {
  try {
    await guardProject(input.projectId);
    const name = input.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return { ok: false, error: "Nome inválido" };
    const channel = await chat.createChannel(input.projectId, name);
    return { ok: true, data: channel };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
