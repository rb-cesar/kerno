"use server";

import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validations";
import type { AuthFormState } from "@/app/(auth)/login/actions";

const API_URL = process.env.API_URL ?? "http://localhost:3333/api";

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

  // Criação da conta vai para a API (NestJS). Sem Prisma/bcrypt no web.
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  if (res.status === 409) {
    return { error: "Já existe uma conta com este e-mail" };
  }
  if (!res.ok) {
    return { error: "Não foi possível criar a conta" };
  }

  // Estabelece a sessão NextAuth (authorize chama /auth/login).
  // signIn lança um redirect para /app em caso de sucesso.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/app",
  });
  return null;
}
