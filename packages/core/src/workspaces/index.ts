// @kerno/core/workspaces — domínio do núcleo (workspace / projeto / membro).
// Serviços (regras + acesso a dados via Prisma) e autorização de membership.
// API pública do módulo; nada de fora importa os arquivos internos.

export * from "./permissions";
export * from "./project-service";
export * from "./member-service";
