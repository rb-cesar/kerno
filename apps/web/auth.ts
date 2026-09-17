import { prisma } from "@kerno/db";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { loginSchema } from "./lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      // Auth acontece aqui direto (sem BFF): mesmo processo, mesmo banco.
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.avatar ?? null };
      },
    }),
  ],
});
