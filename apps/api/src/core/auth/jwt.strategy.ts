import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

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

  validate(payload: JwtPayload): RequestUser {
    return { id: payload.sub, name: payload.name, email: payload.email };
  }
}
