import { z } from "zod";

// Entradas validadas na fronteira HTTP (zValidator no controller). O tipo é
// derivado do schema — uma declaração só, não duas (schema + interface).

export const createWorkspaceInputSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(60),
  description: z.string().max(500).nullable().optional(),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;

export const inviteMemberInputSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});
export type InviteMemberInput = z.infer<typeof inviteMemberInputSchema>;

const workspaceRoleSchema = z.enum(["ADMIN", "MEMBER", "VIEWER"]);

export const updateMemberInputSchema = z.object({
  userId: z.string().min(1),
  role: workspaceRoleSchema.optional(),
});
export type UpdateMemberInput = z.infer<typeof updateMemberInputSchema>;
