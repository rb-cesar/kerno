import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@kerno/db";
import {
  addProjectMember,
  getProjectMembership,
  getProjectWithMembers,
  removeProjectMember,
  type ProjectRole,
} from "@kerno/core/workspaces";
import type {
  ActionResult,
  CreateProjectInput,
  InviteMemberInput,
  ProjectView,
  WorkspaceDetail,
  WorkspaceListItem,
} from "@kerno/contracts/workspaces";
import {
  requireProjectManager,
  requireWorkspaceAdmin,
  requireWorkspaceMember,
} from "./workspaces-permissions";

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
  return base || "workspace";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

@Injectable()
export class WorkspacesService {
  // ---------- leituras ----------

  async listForUser(userId: string): Promise<WorkspaceListItem[]> {
    const workspaces = await prisma.workspace.findMany({
      where: { users: { some: { userId } } },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { projects: true } } },
    });
    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      projectCount: w._count.projects,
    }));
  }

  async getBySlug(userId: string, slug: string): Promise<WorkspaceDetail> {
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: { users: { include: { user: true }, orderBy: { role: "asc" } } },
    });
    if (!workspace) throw new NotFoundException("Workspace não encontrado");

    const myMembership = workspace.users.find((m) => m.userId === userId);
    if (!myMembership) throw new ForbiddenException("Você não tem acesso a este workspace");

    const projects = await prisma.project.findMany({
      where: { workspaceId: workspace.id, users: { some: { userId } } },
      orderBy: { createdAt: "asc" },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      myRole: myMembership.role,
      projects: projects.map((p) => ({ id: p.id, name: p.name, description: p.description })),
      members: workspace.users.map((m) => ({ id: m.user.id, name: m.user.name, role: m.role })),
    };
  }

  async getProjectView(userId: string, projectId: string): Promise<ProjectView> {
    const membership = await getProjectMembership(userId, projectId);
    if (!membership) throw new NotFoundException("Projeto não encontrado");

    const project = await getProjectWithMembers(projectId, userId);
    if (!project) throw new NotFoundException("Projeto não encontrado");

    return {
      id: project.id,
      name: project.name,
      projectMembers: project.projectMembers,
      workspaceMembers: project.workspaceMembers,
      myWorkspaceRole: project.myWorkspaceRole,
      myProjectRole: membership.role,
    };
  }

  // ---------- mutações ----------

  async createWorkspace(userId: string, name: string): Promise<{ slug: string }> {
    const base = slugify(name);
    let slug = base;
    let n = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const workspace = await prisma.workspace.create({
      data: { name, slug, users: { create: { userId, role: "ADMIN" } } },
    });
    return { slug: workspace.slug };
  }

  async createProject(
    userId: string,
    workspaceId: string,
    input: CreateProjectInput,
  ): Promise<{ projectId: string }> {
    await requireWorkspaceMember(userId, workspaceId);

    const description = input.description?.trim() || null;
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description,
        workspaceId,
        users: { create: { userId, role: "LEAD" } },
        boards: {
          create: {
            name: "Principal",
            columns: {
              create: [
                { name: "To Do", order: 0 },
                { name: "In Progress", order: 1 },
                { name: "Done", order: 2 },
              ],
            },
          },
        },
        channels: { create: { name: "geral", isDefault: true } },
      },
    });
    return { projectId: project.id };
  }

  async invite(userId: string, workspaceId: string, input: InviteMemberInput): Promise<ActionResult> {
    try {
      await requireWorkspaceAdmin(userId, workspaceId);

      const target = await prisma.user.findUnique({ where: { email: input.email } });
      if (!target) {
        return {
          ok: false,
          error: "Nenhum usuário do Kerno com este e-mail (no MVP, convide quem já tem conta)",
        };
      }

      const already = await prisma.workspaceUser.findUnique({
        where: { userId_workspaceId: { userId: target.id, workspaceId } },
      });
      if (already) return { ok: false, error: "Este usuário já é membro do workspace" };

      await prisma.workspaceUser.create({
        data: { userId: target.id, workspaceId, role: input.role },
      });
      return { ok: true, message: `${target.name} adicionado ao workspace` };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async addMember(
    userId: string,
    projectId: string,
    input: { userId: string; role?: ProjectRole },
  ): Promise<ActionResult> {
    try {
      await requireProjectManager(userId, projectId);
      await addProjectMember({ projectId, userId: input.userId, role: input.role });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async removeMember(userId: string, projectId: string, targetUserId: string): Promise<ActionResult> {
    try {
      await requireProjectManager(userId, projectId);
      await removeProjectMember({ projectId, userId: targetUserId });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}
