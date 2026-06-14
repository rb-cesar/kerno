# Kerno

> Your dev environment, unified.

Plataforma modular para times de TI — um núcleo compartilhado (identidade, contexto, event bus) ao redor do qual rodam hubs independentes (Kanban, Chat, e futuros).

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **App:** Next.js 15 (App Router) fullstack + custom server (Next + Socket.io no mesmo processo)
- **Realtime:** Socket.io (self-hosted)
- **Auth:** NextAuth v5 / Auth.js (Credentials + JWT) — _Fase 1_
- **DB:** PostgreSQL + Prisma
- **UI:** Tailwind CSS + shadcn/ui

## Estrutura

```
kerno/
├── apps/web/              # Next.js + server.ts (Next + Socket.io)
├── packages/
│   ├── core/             # núcleo: event bus tipado
│   ├── db/               # Prisma client + schema + migrations
│   ├── types/            # contratos de eventos compartilhados
│   ├── ui/               # componentes compartilhados (shadcn)
│   └── hubs/
│       ├── kanban/
│       └── chat/
├── docker-compose.yml    # Postgres local
└── turbo.json
```

## Pré-requisitos

- Node.js >= 20
- pnpm 9 (`corepack prepare pnpm@9.15.9 --activate`)
- Docker Desktop (para o Postgres local)

## Setup

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar env
cp .env.example .env

# 3. Subir o Postgres
pnpm docker:up

# 4. Aplicar o schema no banco
pnpm db:migrate

# 5. Rodar a app (Next + Socket.io)
pnpm dev
```

App em http://localhost:3000

### Dados de exemplo (seed)

```bash
pnpm db:seed
```

Cria o workspace **Kerno Demo** com o projeto **Onboarding do Kerno** (board com
cards/labels e canais com mensagens). Logins:

- `ana@kerno.dev` / `password123` (admin)
- `bruno@kerno.dev` / `password123`

> Integração entre hubs: ao mover um card no Kanban, o Chat posta automaticamente
> uma mensagem de sistema no canal padrão (ex.: _"Ana moveu 'X' para Done ✓"_).

## Scripts úteis

| Comando             | O que faz                                  |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Sobe a app em modo dev (custom server)     |
| `pnpm build`        | Build de produção                          |
| `pnpm typecheck`    | Type-check de todos os pacotes             |
| `pnpm db:migrate`   | Cria/aplica migrations (Prisma)            |
| `pnpm db:studio`    | Abre o Prisma Studio                       |
| `pnpm db:generate`  | Regenera o Prisma Client                   |
| `pnpm docker:up`    | Sobe o Postgres                            |
| `pnpm docker:down`  | Derruba o Postgres                         |

## Roadmap

- **Fase 0** — Scaffold do monorepo ✅
- **Fase 1** — Núcleo (auth, workspace/project, permissões, app shell, event dispatcher) ✅
- **Fase 2** — Hub Kanban ✅
- **Fase 3** — Hub Chat ✅
- **Fase 4** — Integração entre hubs + seed + validação ✅

MVP completo. Próximos passos (roadmap do documento): Agenda Hub, GitHub Hub,
threads/busca no Chat, deploy.
