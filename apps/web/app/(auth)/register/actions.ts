"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@kerno/db";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validations";
import type { AuthFormState } from "@/app/(auth)/login/actions";

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash } });

  // signIn lança um redirect para /app em caso de sucesso.
  await signIn("credentials", { email, password, redirectTo: "/app" });
  return null;
}
