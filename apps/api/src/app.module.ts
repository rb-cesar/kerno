import { Module } from "@nestjs/common";
import { AuthModule } from "./core/auth/auth.module";
import { WorkspacesModule } from "./core/workspaces/workspaces.module";
import { ChatModule } from "./modules/chat/chat.module";
import { KanbanModule } from "./modules/kanban/kanban.module";

@Module({
  imports: [AuthModule, WorkspacesModule, KanbanModule, ChatModule],
})
export class AppModule {}
