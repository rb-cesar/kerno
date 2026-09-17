# Deploy do Kerno

O Kerno é **um processo só**: Next.js + API (Hono, montada como route handler)
+ Socket.io, tudo no mesmo `apps/web`, atrás de um custom server (`server.ts`).
Sem BFF, sem serviço separado — a sessão é o cookie do NextAuth.

| Peça | O que é | Onde hospedar |
|---|---|---|
| **apps/web** | Next.js + API + Socket.io, **long-running** | Railway / Render / Fly — **nunca** Vercel serverless |
| **Postgres** | Banco | Railway / Neon / Supabase / qualquer Postgres gerenciado |

> ⚠️ O Socket.io precisa de um processo persistente com WebSocket. O modelo
> serverless da Vercel **não** serve aqui.

Ordem recomendada: **1) Postgres → 2) Web**.

---

## Pré-requisitos no repositório (já configurados)

- **`postinstall`** na raiz roda `pnpm --filter @kerno/db generate` → gera o Prisma Client após o `install`. Sem isso, o build falha com erros de tipo (`any`).
- **`apps/web` `start`** usa `--env-file-if-exists` → não quebra quando não há `.env` (em produção as envs vêm do painel do host).
- **`server.ts`** escuta em `PORT` (injetado dinamicamente por hosts como Railway) e `HOST`.

Build/Start (monorepo pnpm):

| Comando | O que faz |
|---|---|
| `pnpm --filter @kerno/web build` | `next build` |
| `pnpm --filter @kerno/web start` | sobe `server.ts` (Next + API + Socket.io) com `NODE_ENV=production` |

O `install` é `pnpm install --frozen-lockfile` (roda o `postinstall` automaticamente).

---

## 1) Postgres

Provisione um Postgres gerenciado e copie a **connection string** (`DATABASE_URL`).
Depois, com essa URL, aplique o schema **uma vez** a partir da sua máquina:

```bash
DATABASE_URL="postgresql://...prod..." pnpm --filter @kerno/db push
```

(O projeto usa `prisma db push` — sync sem histórico de migrations. Ver notas no `kanban` se quiser migrar para migrations versionadas no futuro.)

## 2) Web (Next.js + API + Socket.io)

Crie um serviço apontando para este repositório (Railway/Render/Fly — precisa
de processo persistente). Configure:

- **Build**: `pnpm --filter @kerno/web build` · **Start**: `pnpm --filter @kerno/web start`
- **Variáveis de ambiente**:
  - `DATABASE_URL` — a do Postgres do passo 1
  - `AUTH_SECRET` — segredo forte (`openssl rand -base64 32`)
  - `AUTH_URL` — a URL pública do serviço. Ex.: `https://kerno-web.up.railway.app`
    (usada pelo NextAuth **e** para decidir o prefixo seguro do cookie de sessão — `https://` liga o `__Secure-` prefix)
  - `NODE_ENV=production`
  - `PORT`/`HOST` são injetados pelo host (não precisa definir).

---

## Checklist pós-deploy

- [ ] `DATABASE_URL` aplicada (`db push`) e o web conectando ao banco.
- [ ] `AUTH_SECRET` definido (login/registro funcionam).
- [ ] `AUTH_URL` bate com a URL pública real (senão o cookie de sessão não é lido — API e socket voltam 403).
- [ ] Realtime: abrir o app em duas abas e confirmar que mudanças propagam (Socket.io na mesma origem, sem configuração extra).
