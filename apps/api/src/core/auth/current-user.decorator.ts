import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { RequestUser } from "./jwt.strategy";

/** Injeta o usuário autenticado (populado pela JwtStrategy) no handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    return ctx.switchToHttp().getRequest<{ user: RequestUser }>().user;
  },
);
