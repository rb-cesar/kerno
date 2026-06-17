import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import type {
  CreateChannelInput,
  OpenDirectInput,
  SendDirectMessageInput,
  SendMessageInput,
} from "@kerno/contracts/chat";
import { CurrentUser } from "../../core/auth/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/jwt-auth.guard";
import type { RequestUser } from "../../core/auth/jwt.strategy";
import { ChatService } from "./chat.service";

@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** Carga inicial: canais + membros + mensagens do 1º canal. */
  @Get("projects/:projectId")
  forProject(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.chat.chatForProject(user.id, projectId);
  }

  @Get("channels/:channelId/messages")
  messages(@CurrentUser() user: RequestUser, @Param("channelId") channelId: string) {
    return this.chat.fetchMessages(user.id, channelId);
  }

  @Post("messages")
  @HttpCode(200)
  send(@CurrentUser() user: RequestUser, @Body() body: SendMessageInput) {
    return this.chat.sendMessage(user.id, body);
  }

  @Post("channels")
  createChannel(@CurrentUser() user: RequestUser, @Body() body: CreateChannelInput) {
    return this.chat.createChannel(user.id, body);
  }

  // ── Mensagens diretas (DM) ────────────────────────────────────────────────

  /** Abre (ou recupera) a conversa privada com outro membro. */
  @Post("direct")
  @HttpCode(200)
  openDirect(@CurrentUser() user: RequestUser, @Body() body: OpenDirectInput) {
    return this.chat.openDirect(user.id, body);
  }

  @Get("direct/:conversationId/messages")
  directMessages(
    @CurrentUser() user: RequestUser,
    @Param("conversationId") conversationId: string,
  ) {
    return this.chat.directMessages(user.id, conversationId);
  }

  @Post("direct/messages")
  @HttpCode(200)
  sendDirect(@CurrentUser() user: RequestUser, @Body() body: SendDirectMessageInput) {
    return this.chat.sendDirect(user.id, body);
  }
}
