import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@kerno/db";
import {
  addWorkspaceMember,
  getWorkspaceWithMembers,
  removeWorkspaceMember,
  type WorkspaceRole,
} from "@kerno/core/workspaces";
import type {
  ActionResult,
  CreateWorkspaceInput,
  InviteMemberInput,
  WorkspaceListItem,
  WorkspaceView,
} from "@kerno/contracts/workspaces";
import { DEFAULT_BOARD_COLUMNS } from "@kerno/contracts/kanban";
import { requireWorkspaceAdmin } from "./workspaces-permissions";

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

/** Chave curta p/ os cards (ex.: "Kerno App" → "KERN"). Sem garantia de unicidade. */
function workspaceKeyFromName(name: string): string {
  const letters = name.normalize("NFD").replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, 4) || "WORK";
}

@Injectable()
export class WorkspacesService {
  // ---------- leituras ----------

  async listForUser(userId: string): Promise<WorkspaceListItem[]> {
    const workspaces = await prisma.workspace.findMany({
      where: { users: { some: { userId } } },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      memberCount: w._count.users,
    }));
  }

  async getBySlug(userId: string, slug: string): Promise<WorkspaceView> {
    const found = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!found) throw new NotFoundException("Workspace não encontrado");

    const view = await getWorkspaceWithMembers(found.id, userId);
    if (!view) throw new NotFoundException("Workspace não encontrado");
    if (!view.myRole) throw new ForbiddenException("Você não tem acesso a este workspace");

    return {
      id: view.id,
      name: view.name,
      slug: view.slug,
      description: view.description,
      myRole: view.myRole,
      members: view.members,
    };
  }

  // ---------- mutações ----------

  /**
   * Cria o workspace já com seu board padrão e canal #geral (antes a criação do
   * projeto fazia isso; ao remover a camada Project, virou criação do workspace).
   */
  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<{ slug: string }> {
    const base = slugify(input.name);
    let slug = base;
    let n = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: input.name,
        slug,
        description: input.description?.trim() || null,
        key: workspaceKeyFromName(input.name),
        users: { create: { userId, role: "ADMIN" } },
        boards: {
          create: {
            name: "Principal",
            // Estados padrão (fonte única em @kerno/contracts) — mesmos do createBoard.
            columns: { create: [...DEFAULT_BOARD_COLUMNS] },
          },
        },
        channels: { create: { name: "geral", isDefault: true } },
      },
    });
    return { slug: workspace.slug };
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

      await addWorkspaceMember({ workspaceId, userId: target.id, role: input.role });
      return { ok: true, message: `${target.name} adicionado ao workspace` };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async updateMember(
    userId: string,
    workspaceId: string,
    input: { userId: string; role?: WorkspaceRole },
  ): Promise<ActionResult> {
    try {
      await requireWorkspaceAdmin(userId, workspaceId);
      await addWorkspaceMember({ workspaceId, userId: input.userId, role: input.role });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async removeMember(
    userId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<ActionResult> {
    try {
      await requireWorkspaceAdmin(userId, workspaceId);
      await removeWorkspaceMember({ workspaceId, userId: targetUserId });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}
