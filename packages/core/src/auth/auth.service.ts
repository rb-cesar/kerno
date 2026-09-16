import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@kerno/db";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  /** Mesma checagem do provider Credentials do NextAuth (bcrypt + passwordHash). */
  private async issue(user: { id: string; name: string; email: string; avatar: string | null }): Promise<AuthResult> {
    const token = await this.jwt.signAsync({
      sub: user.id,
      name: user.name,
      email: user.email,
    });
    return { token, user: { id: user.id, name: user.name, email: user.email, image: user.avatar } };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Credenciais inválidas");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Credenciais inválidas");

    return this.issue(user);
  }

  async register(name: string, email: string, password: string): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Já existe uma conta com este e-mail");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });

    return this.issue(user);
  }
}
