# Deploy do Kerno

O Kerno é **um processo só, um package só**: Next.js + API (Hono, montada como
route handler) + Socket.io, atrás de um custom server (`server.ts`) na raiz do
repo. Sem BFF, sem serviço separado — a sessão é o cookie do NextAuth.

| Peça | O que é | Onde hospedar |
|---|---|---|
| **web** (raiz do repo) | Next.js + API + Socket.io, **long-running** | **Render** (mesmo host do StockUp — ver `render.yaml`) |
| **Postgres** | Banco | Render / Neon / Supabase / qualquer Postgres gerenciado |

> ⚠️ O Socket.io precisa de um processo persistente com WebSocket. O modelo
> serverless da Vercel **não** serve aqui — por isso Render (plano `web`, não
> "static site"), nunca Vercel.
>
> Plano `free` do Render hiberna o processo depois de um tempo sem tráfego e
> volta a subir sob demanda no próximo request (mesmo comportamento que o
> StockUp já usa) — o primeiro acesso depois de um período ocioso demora
> alguns segundos a mais (cold start).

Ordem recomendada: **1) Postgres → 2) Web**. Deploy via Blueprint: no Render,
New + → Blueprint → conecte `rb-cesar/kerno` → ele lê o `render.yaml` da raiz.

---

## Pré-requisitos no repositório (já configurados)

- **`postinstall`** na raiz roda `prisma generate` → gera o Prisma Client após o `install`. Sem isso, o build falha com erros de tipo (`any`).
- **`start`** usa `--env-file-if-exists` → não quebra quando não há `.env` (em produção as envs vêm do painel do host).
- **`server.ts`** escuta em `PORT` (injetado dinamicamente pelo Render) e `HOST`.
- **`render.yaml`** (Blueprint) já define build, start e `healthCheckPath` — ver `GET /api/health` em [api.ts](src/server/api.ts).

Build/Start:

| Comando | O que faz |
|---|---|
| `pnpm build` | `next build` |
| `pnpm start` | sobe `server.ts` (Next + API + Socket.io) com `NODE_ENV=production` |

O `install` é `pnpm install --frozen-lockfile` (roda o `postinstall` automaticamente).

---

## 1) Postgres

Provisione um Postgres gerenciado e copie a **connection string** (`DATABASE_URL`).
Depois, com essa URL, aplique o schema **uma vez** a partir da sua máquina:

```bash
DATABASE_URL="postgresql://...prod..." pnpm db:push
```

(O projeto usa `prisma db push` — sync sem histórico de migrations. Ver notas no `kanban` se quiser migrar para migrations versionadas no futuro.)

## 2) Web (Next.js + API + Socket.io)

O `render.yaml` já cria o serviço via Blueprint (New + → Blueprint → conecte
`rb-cesar/kerno`); só falta preencher no dashboard as variáveis marcadas
`sync: false`:

- `DATABASE_URL` — a do Postgres do passo 1. Se o Postgres for do próprio
  Render, use a **Internal Database URL** (não a External) — a external falha
  do web service com "Connection terminated unexpectedly" mesmo com
  credenciais corretas (rede interna do Render x endpoint externo, sem relação
  com SSL). A external serve normalmente pra rodar `pnpm db:push` da sua
  máquina, só não pro `DATABASE_URL` do serviço em si.
- `AUTH_SECRET` — segredo forte (`openssl rand -base64 32`)
- `AUTH_URL` — a URL pública do serviço. Ex.: `https://kerno.onrender.com`
  (usada pelo NextAuth **e** para decidir o prefixo seguro do cookie de sessão — `https://` liga o `__Secure-` prefix)
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` / `NEXT_PUBLIC_LIVEKIT_WS_URL` —
  do projeto **"Kerno" no LiveKit Cloud** (`Manage API keys`). `LIVEKIT_URL` e
  `NEXT_PUBLIC_LIVEKIT_WS_URL` são a mesma URL (`wss://kerno-xxxxx.livekit.cloud`).
  Render não serve pra self-hostar o LiveKit (precisa de faixa UDP pra mídia,
  que o Render não expõe) — por isso o Cloud, não outro serviço `web` no Render.

`NODE_ENV`, `PORT` e `HOST` já vêm resolvidos pelo `render.yaml`/pelo próprio Render.

---

## Checklist pós-deploy

- [ ] `DATABASE_URL` aplicada (`db push`) e o web conectando ao banco.
- [ ] `AUTH_SECRET` definido (login/registro funcionam).
- [ ] `AUTH_URL` bate com a URL pública real (senão o cookie de sessão não é lido — API e socket voltam 403).
- [ ] Realtime: abrir o app em duas abas e confirmar que mudanças propagam (Socket.io na mesma origem, sem configuração extra).
- [ ] Chamadas: iniciar uma chamada e confirmar que conecta (as 4 envs do LiveKit Cloud preenchidas).
