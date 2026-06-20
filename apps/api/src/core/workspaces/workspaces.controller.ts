import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import type {
  CreateWorkspaceInput,
  InviteMemberInput,
} from "@kerno/contracts/workspaces";
import type { WorkspaceRole } from "@kerno/core/workspaces";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { RequestUser } from "../auth/jwt.strategy";
import { WorkspacesService } from "./workspaces.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get("workspaces")
  list(@CurrentUser() user: RequestUser) {
    return this.workspaces.listForUser(user.id);
  }

  @Get("workspaces/:slug")
  bySlug(@CurrentUser() user: RequestUser, @Param("slug") slug: string) {
    return this.workspaces.getBySlug(user.id, slug);
  }

  @Post("workspaces")
  create(@CurrentUser() user: RequestUser, @Body() body: CreateWorkspaceInput) {
    return this.workspaces.createWorkspace(user.id, body);
  }

  @Post("workspaces/:workspaceId/members")
  @HttpCode(200)
  invite(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Body() body: InviteMemberInput,
  ) {
    return this.workspaces.invite(user.id, workspaceId, body);
  }

  @Post("workspaces/:workspaceId/members/update")
  @HttpCode(200)
  updateMember(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Body() body: { userId: string; role?: WorkspaceRole },
  ) {
    return this.workspaces.updateMember(user.id, workspaceId, body);
  }

  @Delete("workspaces/:workspaceId/members/:userId")
  removeMember(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Param("userId") targetUserId: string,
  ) {
    return this.workspaces.removeMember(user.id, workspaceId, targetUserId);
  }
}
