import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import type {
  CreateProjectInput,
  CreateWorkspaceInput,
  InviteMemberInput,
} from "@kerno/contracts/workspaces";
import type { ProjectRole } from "@kerno/core/workspaces";
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
    return this.workspaces.createWorkspace(user.id, body.name);
  }

  @Post("workspaces/:workspaceId/projects")
  createProject(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateProjectInput,
  ) {
    return this.workspaces.createProject(user.id, workspaceId, body);
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

  @Get("projects/:projectId/view")
  projectView(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.workspaces.getProjectView(user.id, projectId);
  }

  @Post("projects/:projectId/members")
  @HttpCode(200)
  addMember(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: { userId: string; role?: ProjectRole },
  ) {
    return this.workspaces.addMember(user.id, projectId, body);
  }

  @Delete("projects/:projectId/members/:userId")
  removeMember(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("userId") targetUserId: string,
  ) {
    return this.workspaces.removeMember(user.id, projectId, targetUserId);
  }
}
