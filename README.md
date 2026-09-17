# Kerno

> Your dev environment, unified.

Plataforma modular para times de TI — um núcleo compartilhado (identidade, contexto, event bus) ao redor do qual rodam hubs independentes (Kanban, Chat, e futuros).

## Stack

- **Monorepo:** pnpm workspaces (`pnpm -r`, sem orquestrador à parte)
- **App:** Next.js 15 (App Router) fullstack — Next, a API (Hono) e o Socket.io no
  mesmo processo (custom `server.ts`)
- **API:** Hono, montada como route handler do Next (`app/api/[[...route]]`)
- **Realtime:** Socket.io (self-hosted, mesma origem — sessão via cookie)
- **Auth:** NextAuth v5 / Auth.js (Credentials) — sessão única, sem BFF
- **DB:** PostgreSQL + Prisma (schema multi-arquivo, um `.prisma` por dono)
- **UI:** Tailwind CSS + Radix
- **Lint/format:** Biome

## Estrutura

```
kerno/
├── apps/web/                    # Next.js + server.ts (Next + API Hono + Socket.io)
│   └── server/                  # composition root, api.ts, realtime, integrações
├── packages/
│   ├── core/                    # núcleo: events, errors, http (sessão), workspaces
│   ├── db/                      # Prisma client + schema (um .prisma por dono) + migrations
│   ├── editor/                  # editor Lexical compartilhado (kanban + chat)
│   ├── ui/                      # componentes compartilhados (Radix)
│   └── modules/
│       ├── kanban/
│       └── chat/
├── docker-compose.yml            # Postgres local
└── biome.json
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
