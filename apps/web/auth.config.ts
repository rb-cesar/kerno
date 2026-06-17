import type { NextAuthConfig } from "next-auth";

/**
 * Configuração base, segura para o edge runtime (sem Prisma/bcrypt).
 * Usada pelo middleware. O provider Credentials vive em `auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      const isAuthRoute = pathname === "/login" || pathname === "/register";

      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/app", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (user && "apiToken" in user && typeof user.apiToken === "string") {
        token.apiToken = user.apiToken;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      if (typeof token.apiToken === "string") {
        session.apiToken = token.apiToken;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
