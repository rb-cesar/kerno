"use server";

import { createUser } from "@kerno/core/auth";
import type { AuthFormState } from "@/app/(auth)/login/actions";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validations";

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

  try {
    await createUser(parsed.data.name, parsed.data.email, parsed.data.password);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar a conta";
    return { error: message };
  }

  // Estabelece a sessão NextAuth (authorize confere email/senha).
  // signIn lança um redirect para /app em caso de sucesso.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/app",
  });
  return null;
}
