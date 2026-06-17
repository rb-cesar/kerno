import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** JWT emitido pela API (NestJS). O web age como BFF e o anexa nas chamadas. */
    apiToken?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
  interface User {
    apiToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    apiToken?: string;
  }
}
