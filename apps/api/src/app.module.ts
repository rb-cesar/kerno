import { Module } from "@nestjs/common";
import { AuthModule } from "@kerno/core/auth";
import { WorkspacesModule } from "@kerno/core/workspaces-api";
import { KanbanApiModule } from "@kerno/kanban/api";
import { ChatApiModule } from "@kerno/chat/api";

@Module({
  imports: [AuthModule, WorkspacesModule, KanbanApiModule, ChatApiModule],
})
export class AppModule {}
