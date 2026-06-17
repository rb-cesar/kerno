import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { loginSchema } from "./lib/validations";

const API_URL = process.env.API_URL ?? "http://localhost:3333/api";

interface ApiLoginResponse {
  token: string;
  user: { id: string; name: string; email: string; image: string | null };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      // BFF: a autenticação acontece na API (NestJS). O web só guarda o JWT
      // emitido e o repassa nas chamadas. Sem bcrypt/Prisma aqui.
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        if (!res.ok) return null;

        const { token, user } = (await res.json()) as ApiLoginResponse;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          apiToken: token,
        };
      },
    }),
  ],
});
