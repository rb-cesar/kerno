import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { prisma } from "@kerno/db";

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
}

/** O usuário autenticado disponível em `req.user` após o JwtAuthGuard. */
export interface RequestUser {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET não definido");
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  /**
   * Além de validar a assinatura do JWT, confirma que o usuário ainda existe.
   * Tokens de usuários removidos/recriados (ex.: após reset do banco em dev)
   * viram 401 limpo aqui — em vez de estourar mais à frente numa violação de FK.
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new UnauthorizedException("Sessão inválida");
    return { id: user.id, name: user.name, email: user.email };
  }
}
