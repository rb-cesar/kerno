import { Hono } from "hono";
import type { CreateWorkspaceInput, InviteMemberInput } from "@kerno/contracts/workspaces";
import { requireUser, type AuthEnv } from "../http";
import type { WorkspaceRole } from "./workspace.service";
import type { WorkspaceService } from "./workspace.service";

export function createWorkspaceController(workspaces: WorkspaceService) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireUser);

  app.get("/", async (c) => c.json(await workspaces.listForUser(c.get("userId"))));

  app.get("/:slug", async (c) =>
    c.json(await workspaces.getBySlug(c.get("userId"), c.req.param("slug"))),
  );

  app.post("/", async (c) => {
    const body = await c.req.json<CreateWorkspaceInput>();
    return c.json(await workspaces.createWorkspace(c.get("userId"), body));
  });

  app.post("/:workspaceId/members", async (c) => {
    const body = await c.req.json<InviteMemberInput>();
    return c.json(await workspaces.invite(c.get("userId"), c.req.param("workspaceId"), body));
  });

  app.post("/:workspaceId/members/update", async (c) => {
    const body = await c.req.json<{ userId: string; role?: WorkspaceRole }>();
    return c.json(
      await workspaces.updateMember(c.get("userId"), c.req.param("workspaceId"), body),
    );
  });

  app.delete("/:workspaceId/members/:userId", async (c) =>
    c.json(
      await workspaces.removeMember(
        c.get("userId"),
        c.req.param("workspaceId"),
        c.req.param("userId"),
      ),
    ),
  );

  return app;
}
