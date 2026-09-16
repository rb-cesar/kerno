// @kerno/core/auth — infra de autenticação Nest compartilhada (o "pai" provê).
// AuthModule (login/register/me) + guard/decorator/strategy reusados por todos os
// módulos da API.

export { AuthModule } from "./auth.module";
export { AuthService, type AuthResult, type AuthUser } from "./auth.service";
export { JwtAuthGuard } from "./jwt-auth.guard";
export { CurrentUser } from "./current-user.decorator";
export { JwtStrategy, type JwtPayload, type RequestUser } from "./jwt.strategy";
