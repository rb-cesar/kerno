# Deploy do Kerno

O Kerno tem **3 peças** com requisitos diferentes:

| Peça | O que é | Onde hospedar |
|---|---|---|
| **apps/web** | Next.js (App Router), NextAuth, é só **BFF** (não acessa o banco direto) | Vercel **ou** Railway/Render/Fly |
| **apps/api** | NestJS **long-running** + **Socket.io** (realtime) + Prisma | Railway / Render / Fly — **nunca** Vercel serverless |
| **Postgres** | Banco | Railway / Neon / Supabase / qualquer Postgres gerenciado |

> ⚠️ A API e o Socket.io precisam de um processo persistente com WebSocket. O modelo serverless da Vercel **não** serve para elas — só para o web.

Ordem recomendada: **1) Postgres → 2) API → 3) Web** (o web precisa da URL da API).

---

## Pré-requisitos no repositório (já configurados)

- **`postinstall`** na raiz roda `pnpm --filter @kerno/db generate` → gera o Prisma Client (com o schema montado pelo `gather.mjs`) após o `install`. Sem isso, o build do web/api falha com erros de tipo (`any`).
- **`apps/web` `start`** usa `--env-file-if-exists` → não quebra quando não há `.env` (em produção as envs vêm do painel do host).
- **`apps/api`** escuta em `API_PORT ?? PORT ?? 3333` e em `0.0.0.0` → funciona em hosts que injetam `PORT` dinamicamente (Railway).

Build/Start de cada serviço (monorepo pnpm):

| Serviço | Build command | Start command |
|---|---|---|
| web | `pnpm --filter @kerno/web build` | `pnpm --filter @kerno/web start` |
| api | (nenhum — roda via ts-node-dev) | `pnpm --filter @kerno/api start` |

O `install` é `pnpm install --frozen-lockfile` (roda o `postinstall` automaticamente).

---

## 1) Postgres

Provisione um Postgres gerenciado e copie a **connection string** (`DATABASE_URL`).
Depois, com essa URL, aplique o schema **uma vez** a partir da sua máquina:

```bash
DATABASE_URL="postgresql://...prod..." pnpm --filter @kerno/db push
```

(O projeto usa `prisma db push` — sync sem histórico de migrations. Ver notas no `kanban` se quiser migrar para migrations versionadas no futuro.)

## 2) API (NestJS + Socket.io)

Crie um serviço apontando para este repositório. Configure:

- **Start command**: `pnpm --filter @kerno/api start`
- **Variáveis de ambiente**:
  - `DATABASE_URL` — a do Postgres do passo 1
  - `AUTH_SECRET` — segredo forte (`openssl rand -base64 32`). **Guarde**: o web usa o MESMO valor.
  - `WEB_ORIGIN` — a URL pública do web (passo 3), para o CORS. Ex.: `https://kerno-web.up.railway.app`
  - `NODE_ENV=production`
  - **Não** defina `API_PORT` no Railway — deixe a API cair para o `PORT` que o host injeta.

Anote a **URL pública da API** (ex.: `https://kerno-api.up.railway.app`).

## 3) Web (Next.js / BFF)

Crie o serviço do web (Vercel ou outro host). Configure:

- **Build**: `pnpm --filter @kerno/web build` · **Start**: `pnpm --filter @kerno/web start`
  - Na **Vercel**: Root Directory = `apps/web`, framework Next.js; o `install`/`build` do monorepo é detectado (pnpm). O `server.ts` é ignorado pela Vercel (Next roda direto) — tudo bem, o Socket.io vive na API.
- **Variáveis de ambiente**:
  - `API_URL` — base da API **com `/api`**. Ex.: `https://kerno-api.up.railway.app/api`
    (usada pelo BFF **e** para derivar a origem do Socket.io — tira o `/api`)
  - `AUTH_SECRET` — **o mesmo** valor da API
  - `AUTH_URL` — a URL pública do web. Ex.: `https://kerno-web.up.railway.app`
  - `NODE_ENV=production`
  - `PORT`/`HOST` são injetados pelo host (não precisa definir).

---

## Checklist pós-deploy

- [ ] `DATABASE_URL` aplicada (`db push`) e API conectando ao banco.
- [ ] `AUTH_SECRET` **idêntico** em web e API (senão o login falha com 401).
- [ ] `WEB_ORIGIN` (na API) = URL do web, senão o navegador bloqueia por CORS.
- [ ] `API_URL` (no web) aponta para a API com `/api` no fim.
- [ ] Realtime: abrir o app em duas abas e confirmar que mudanças propagam (Socket.io conectando na origem da `API_URL`).
