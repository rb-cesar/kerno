import { prisma } from "@/core/db";
import { Forbidden, NotFound } from "@/core/errors";
import { DEFAULT_BOARD_COLUMNS } from "@/modules/kanban/types";
import type { CreateWorkspaceInput, InviteMemberInput, UpdateMemberInput } from "../dto";
import type { ActionResult, WorkspaceListItem, WorkspaceView } from "../types";
import { requireWorkspaceAdmin } from "./permissions";

const WORKSPACE_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

type WorkspaceMemberRow = { id: string; name: string; role: string };

type WorkspaceWithMembers = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  members: WorkspaceMemberRow[];
  /** Papel do usuário atual no workspace (ou null). */
  myRole: string | null;
};

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
  const letters = name
    .normalize("NFD")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  return letters.slice(0, 4) || "WORK";
}

/** Snapshot do workspace + membros consumido pelo layout. */
async function getWorkspaceWithMembers(workspaceId: string, userId: string): Promise<WorkspaceWithMembers | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      users: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    members: workspace.users.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
    })),
    myRole: workspace.users.find((m) => m.userId === userId)?.role ?? null,
  };
}

async function addWorkspaceMember(input: { workspaceId: string; userId: string; role?: WorkspaceRole }): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { id: true },
  });
  if (!workspace) throw new NotFound("Workspace não encontrado");

  const role: WorkspaceRole = input.role && WORKSPACE_ROLES.includes(input.role) ? input.role : "MEMBER";

  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: input.userId, workspaceId: input.workspaceId } },
    update: { role },
    create: { userId: input.userId, workspaceId: input.workspaceId, role },
  });
}

async function removeWorkspaceMember(input: { workspaceId: string; userId: string }): Promise<void> {
  const target = await prisma.workspaceUser.findUnique({
    where: { userId_workspaceId: { userId: input.userId, workspaceId: input.workspaceId } },
  });
  if (!target) throw new NotFound("Membro não encontrado no workspace");

  if (target.role === "ADMIN") {
    const adminCount = await prisma.workspaceUser.count({
      where: { workspaceId: input.workspaceId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new Error("O workspace precisa de pelo menos um admin");
    }
  }

  await prisma.workspaceUser.delete({
    where: { userId_workspaceId: { userId: input.userId, workspaceId: input.workspaceId } },
  });
}

export class WorkspaceService {
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
    if (!found) throw new NotFound("Workspace não encontrado");

    const view = await getWorkspaceWithMembers(found.id, userId);
    if (!view) throw new NotFound("Workspace não encontrado");
    if (!view.myRole) throw new Forbidden("Você não tem acesso a este workspace");

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
   * Cria o workspace já com seu board padrão e canal #geral, numa única escrita
   * (nested create do Prisma) — atômico, sem estado intermediário inconsistente.
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
            // Estados padrão (fonte única em @/modules/kanban/types) — mesmos do createBoard.
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

  async updateMember(userId: string, workspaceId: string, input: UpdateMemberInput): Promise<ActionResult> {
    try {
      await requireWorkspaceAdmin(userId, workspaceId);
      await addWorkspaceMember({ workspaceId, userId: input.userId, role: input.role });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  async removeMember(userId: string, workspaceId: string, targetUserId: string): Promise<ActionResult> {
    try {
      await requireWorkspaceAdmin(userId, workspaceId);
      await removeWorkspaceMember({ workspaceId, userId: targetUserId });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }
}

export function createWorkspaceService(): WorkspaceService {
  return new WorkspaceService();
}
