import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa de no mínimo 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(60),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
