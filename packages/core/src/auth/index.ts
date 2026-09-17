// @kerno/core/auth — criação de conta (hash + persistência). O login em si é
// NextAuth puro (apps/web/auth.ts): sem BFF, sem JWT próprio, uma única sessão.
export { createUser, type NewUser } from "./create-user";
