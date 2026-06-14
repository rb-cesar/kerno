import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Garante um usuário autenticado em Server Components / actions. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}
