import { prisma } from "@kerno/db";
import bcrypt from "bcryptjs";
import { RuleViolation } from "../errors";

export interface NewUser {
  id: string;
  name: string;
  email: string;
}

/** Cria a conta (hash da senha + registro). Lança RuleViolation se o e-mail já existe. */
export async function createUser(name: string, email: string, password: string): Promise<NewUser> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new RuleViolation("Já existe uma conta com este e-mail");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true },
  });
  return user;
}
