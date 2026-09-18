import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/core/db";
import { board } from "./domain/board";
// import { eventBus } from "@/core/events";
import { KanbanService } from "./service";

const suffix = Math.random().toString(36).slice(2, 8);
let userId: string, outsiderId: string, workspaceId: string, boardId: string;
const kanban = new KanbanService();

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: "t",
      email: `test+${suffix}@example.com`,
      passwordHash: "password123",
    },
  });

  const outsider = await prisma.user.create({
    data: {
      name: "o",
      email: `o-${suffix}@x.io`,
      passwordHash: "x",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "T",
      slug: `t-${suffix}`,
      users: { create: { userId: user.id, role: "ADMIN" } },
    },
  });

  const createdBoard = await board.createBoardWithDefaults(workspace.id, workspace.name);

  boardId = createdBoard.id;
  userId = user.id;
  outsiderId = outsider.id;
  workspaceId = workspace.id;
});

afterAll(async () => {
  await prisma.workspace.delete({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, outsiderId] } } });
});

describe("KanbanService", () => {
  it("cria card e ele aparece no snapshot", async () => {
    /* runCommand({type:"card:create",...}) → snapshot → expect */
  });

  it("move card e publica card:moved", async () => {
    /* eventBus.on("card:moved") + runCommand move */
  });

  it("nega snapshot a nâo-membro", async () => {
    await expect(kanban.snapshot(outsiderId, boardId)).rejects.toThrow();
  });
});
