import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import type {
  CreateChannelInput,
  EditMessageInput,
  OpenDirectInput,
  SendDirectMessageInput,
  SendMessageInput,
  ToggleReactionInput,
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
  @Get("workspaces/:workspaceId")
  forWorkspace(@CurrentUser() user: RequestUser, @Param("workspaceId") workspaceId: string) {
    return this.chat.chatForWorkspace(user.id, workspaceId);
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

  @Post("messages/edit")
  @HttpCode(200)
  editMessage(@CurrentUser() user: RequestUser, @Body() body: EditMessageInput) {
    return this.chat.editMessage(user.id, body);
  }

  @Post("channels")
  createChannel(@CurrentUser() user: RequestUser, @Body() body: CreateChannelInput) {
    return this.chat.createChannel(user.id, body);
  }

  @Post("reactions")
  @HttpCode(200)
  toggleReaction(@CurrentUser() user: RequestUser, @Body() body: ToggleReactionInput) {
    return this.chat.toggleReaction(user.id, body);
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
