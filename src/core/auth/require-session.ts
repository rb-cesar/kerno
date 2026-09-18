import { redirect } from "next/navigation";
import { auth } from "./next-auth";

/** Garante um usuário autenticado em Server Components / actions. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}
