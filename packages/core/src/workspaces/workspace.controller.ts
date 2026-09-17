import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type AuthEnv, requireUser } from "../http";
import {
  createWorkspaceInputSchema,
  inviteMemberInputSchema,
  updateMemberInputSchema,
} from "./workspace.dto";
import type { WorkspaceService } from "./workspace.service";

export function createWorkspaceController(workspaces: WorkspaceService) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireUser);

  app.get("/", async (c) => c.json(await workspaces.listForUser(c.get("userId"))));

  app.get("/:slug", async (c) =>
    c.json(await workspaces.getBySlug(c.get("userId"), c.req.param("slug"))),
  );

  app.post("/", zValidator("json", createWorkspaceInputSchema), async (c) =>
    c.json(await workspaces.createWorkspace(c.get("userId"), c.req.valid("json"))),
  );

  app.post("/:workspaceId/members", zValidator("json", inviteMemberInputSchema), async (c) =>
    c.json(
      await workspaces.invite(c.get("userId"), c.req.param("workspaceId"), c.req.valid("json")),
    ),
  );

  app.post("/:workspaceId/members/update", zValidator("json", updateMemberInputSchema), async (c) =>
    c.json(
      await workspaces.updateMember(
        c.get("userId"),
        c.req.param("workspaceId"),
        c.req.valid("json"),
      ),
    ),
  );

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
