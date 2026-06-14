"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type AuthFormState = { error?: string } | null;

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/app",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos" };
    }
    // signIn lança um redirect em caso de sucesso — precisa propagar.
    throw error;
  }
}
