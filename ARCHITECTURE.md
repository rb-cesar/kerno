# Arquitetura do Kerno

> Documento de referência. Define **como o código é organizado** e **por quê**.
> Decisões aqui valem para todo o projeto; mudanças de arquitetura passam por
> atualizar este arquivo primeiro.

---

## 1. Visão geral

O Kerno é um **monólito modular**: uma única aplicação Next.js — um processo, um
`package.json`, um `tsconfig.json` — organizada em **módulos isolados por
convenção de pasta** (fatias verticais) que se comunicam **apenas por eventos**.

- Não há separação física de backend/frontend. A fronteira é **lógica**: o DTO
  (formato serializável) + a diretiva `"use server"` marcam onde o "lado
  servidor" para e o "lado cliente" começa — mesmo sendo um código só.
- Não há separação física de banco por módulo. Quem desacopla os módulos é o
  **event bus**, não o banco. Um banco e um cliente Prisma só.
- **Não é mais um monorepo pnpm.** Até a simplificação de set/2026 cada módulo
  era um *package* de workspace (`@kerno/kanban`, `@kerno/core`, …), com dois
  apps (`apps/web` + `apps/api`). Isso existiu enquanto havia dois processos
  para compartilhar código entre si; com um app só, a fronteira de package
  virou custo puro (10 `package.json`, `exports` maps, bugs de identidade de
  classe entre bundles — ver §6) sem benefício. A fronteira entre módulos hoje
  é a pasta (`src/modules/<nome>/`) e a disciplina de import, não o compilador.

Estilos de referência: **monólito modular + vertical slices + comunicação por
eventos**. Na camada de dados, **Service + DTO** (Prisma como repositório). Veja
§6 e §11 para a evolução possível.

---

## 2. Estrutura de pastas

```
kerno/
├── package.json · tsconfig.json · biome.json     (um de cada)
├── docker-compose.yml
├── prisma/                       schema/*.prisma · migrations · seed.ts · populate.ts
├── server.ts                     Next + Socket.io
└── src/
    ├── app/                      rotas do Next — finas, só montam a página
    │   ├── (auth)/login · register
    │   ├── (app)/app · w/[slug]/{boards,chat}
    │   └── api/[[...route]] · api/auth/[...nextauth]
    │
    ├── modules/                  ← o produto. Um diretório por hub, mesmo formato em todos
    │   ├── workspaces/           (hoje packages/core/src/workspaces)
    │   ├── kanban/               (hoje packages/modules/kanban)
    │   │   ├── components/       kanban-board.tsx, card-dialog.tsx, …   (hoje web/)
    │   │   ├── server/           controller · service · guards · domain/
    │   │   ├── client.ts         fetch wrappers
    │   │   ├── dto.ts            zod
    │   │   └── types.ts
    │   └── chat/                 idem
    │
    ├── core/                     ← o núcleo: o que todo módulo usa e nenhum módulo é dono
    │   ├── db.ts                 prisma (hoje packages/db)
    │   ├── errors.ts
    │   ├── events/                bus + tipos de evento
    │   ├── auth/                  NextAuth config · sessão por cookie · createUser · requireUser
    │   └── request.ts             ApiError · asResult
    │
    ├── server/                   ← composição: o único lugar que vê todos os módulos
    │   ├── api.ts · container.ts · realtime.ts · event-dispatcher.ts · kanban-chat.ts
    │
    └── components/               ← React compartilhado, sem regra de negócio
        ├── ui/                   button, dialog, select… (hoje packages/ui — convenção shadcn)
        ├── editor/               Lexical (hoje packages/editor)
        ├── theme/                themes.ts + theme-picker + theme-provider (hoje em 3 pastas)
        ├── shell/                topbar, hub-rail, user-menu, dock provider
        └── providers/            socket
```

Tudo importado por `@/*` → `./src/*` (um único path no `tsconfig.json`; sem
`exports` map, sem symlink de workspace).

`core/` é a **base de domínio**: o que qualquer módulo pode importar e nenhum
módulo é dono. `components/ui` e `components/editor` são a base de
**apresentação** (React puro, sem Prisma) — separados de `core/` porque são uma
unidade de interesse diferente (client vs server), não porque sejam pacotes
distintos.

---

## 3. Onde cada coisa mora

Dois eixos decidem:

> **1. É domínio de base, infra, apresentação ou produto?**
> - Domínio/infra de base (events, errors, sessão, Prisma) → **`src/core/`**.
> - Apresentação compartilhada (Radix, editor Lexical) → **`src/components/`**.
> - Hub de produto (dono de uma fatia vertical: dados + regra + UI própria) →
>   **`src/modules/<nome>/`**.
>
> **2. Dá pra remover sem quebrar o Kerno?**
> - Sim → é um módulo (`kanban`, `chat`) → `src/modules/`.
> - Não → é base (`core`/`components`).

`workspaces` é caso especial: é a base de multi-tenancy (todo hub precisa saber
"este recurso é deste workspace, este usuário é membro dele?"), mas modela um
conceito de produto (workspace, membro, papel), não infraestrutura pura — por
isso vive em `src/modules/workspaces/` como os outros hubs, mas é a **única
exceção conhecida** à regra "módulo nunca importa módulo" (§7): kanban e chat
importam `@/modules/workspaces/server/permissions` direto, do mesmo jeito que
importariam algo de `core/`.

---

## 4. Forma padrão de um módulo

Todo módulo (hub) segue o mesmo esqueleto. Forma previsível = você sempre sabe
onde procurar.

```
src/modules/kanban/
├─ types.ts          # DTOs — o contrato que cruza pro client
├─ dto.ts             # schemas zod — a validação de entrada na fronteira HTTP
├─ client.ts          # fetch wrapper fino consumido pelos componentes client
├─ components/        # React (client) — UI do hub
└─ server/
   ├─ controller.ts   # Hono: HTTP ↔ service, zValidator, nada de regra
   ├─ service.ts       # autorização (guards) + despacho pro domínio
   ├─ guards.ts         # resolve "de quem é este recurso" + exige membership
   └─ domain/            # (ou domain.ts, se for um módulo pequeno como chat)
                          # regra de negócio de verdade: fala Prisma, publica
                          # eventos, lança erro tipado (NotFound/Forbidden/RuleViolation)
```

Regras:

- **Um módulo nunca importa outro módulo** (exceto `workspaces`, §3). Kanban
  não conhece Chat. Comunicação só por eventos (§7).
- **Sem barrel por módulo.** Um componente que precisa de `KanbanBoard` importa
  `@/modules/kanban/components/kanban-board` direto — não existe um
  `index.ts` que reexporta tudo do hub. `server/` mantém um `index.ts` fino
  (só controller + service, a superfície que `src/server/container.ts`
  precisa) porque é genuinamente uma fronteira de composição, não conveniência.
- Um módulo pode depender de `core/` e `components/` livremente.
- **A fronteira de auth fica no app/core, não no módulo.** NextAuth vive em
  `core/auth` (sessão única, sem token próprio). O módulo expõe *service*
  (regras) + *controller* (Hono, guarda de rota) + *client* (fetch fino,
  `client.ts`). Server Components chamam o service direto via
  `src/server/container.ts` (mesmo processo, sem HTTP); Client Components
  chamam o `client.ts`, que fala com o *controller* por `/api/...`.

---

## 5. Camadas de dados (Service + DTO)

Uma mesma entidade tem **formatos diferentes** conforme a camada. Confundir os
formatos é a origem da bagunça.

| Formato                             | O que é                           | Onde vive                        |
| ------------------------------------ | ---------------------------------- | --------------------------------- |
| **Modelo (Prisma)**                  | a linha do banco, com FKs          | `prisma/schema` — interno         |
| **Entidade / domínio** *(opcional)*  | regras e invariantes puras         | `modules/<m>/server/domain`       |
| **DTO**                              | formato serializável, enriquecido  | `modules/<m>/types.ts` — público  |

Fluxo de uma requisição (via HTTP, cliente):

```
UI (client)  ──DTO──►  controller (Hono, zValidator)
                          └─► service (guard: resolve o recurso, exige papel)
                                └─► domain (caso de uso)
                                      ├─ fala Prisma direto  ◄── Prisma É o repositório
                                      ├─ valida ids referenciados contra o escopo
                                      ├─ publica evento (eventBus)
                                      └─ lança NotFound/Forbidden/RuleViolation
                          ◄──DTO── volta pro client (erro traduzido 1x em server/api.ts)
```

Papéis:

- **Controller** — traduz HTTP ↔ chamada de método. Sem regra, sem Prisma.
- **Service** — autoriza (via `guards.ts`) e despacha pro domínio certo. Não
  fala Prisma direto nem conhece HTTP.
- **Guards** — resolve "de quem é este recurso" e exige o papel mínimo no
  workspace (`@/modules/workspaces/server/permissions`).
- **Domain** — o caso de uso de verdade: lê/escreve via Prisma, aplica regra,
  publica eventos, devolve **DTO**. Não conhece React nem Hono. Modelo anêmico
  (Prisma como dado + domain com a lógica) é **legítimo** para CRUD simples.
- **DTO (`types.ts`)** — o contrato. Nunca contém tipos do Prisma.
- **`"use server"` actions** (em `app/` ou `modules/<m>/actions.ts`) — usadas
  por Server Components/forms que não passam por HTTP: `auth → service
  (via container) → devolve`. Traduzem erro em `{ ok, error }` para a UI.

### Por que não há camada `repository/`

O **Prisma client já é um data-mapper** — ele é o repositório. Embrulhá-lo num
repository à mão é redundante em CRUD. O domínio fala Prisma direto.
> Evolução: se uma consulta ficar complexa/repetida, extraia **só ela** para um
> `repository.ts` local ao módulo. Não precisa fazer pra tudo. Veja §11.

---

## 6. A regra de ouro

> **Dependência só aponta pra baixo. O Prisma nunca sai da camada de domain.
> Só o DTO cruza a linha do controller/client.**

Consequências verificáveis:

- Um componente em `components/` **nunca** importa `@/core/db`.
- Um DTO **nunca** expõe um tipo gerado pelo Prisma.
- `server/domain` não importa Hono nem React (é fácil de testar sem HTTP).

### Nota histórica: `instanceof` entre bundles

Enquanto o projeto era um monorepo pnpm, um erro de domínio (`NotFound`)
lançado num package (`@kerno/kanban`) podia falhar `instanceof NotFound` no
`onError` de outro package (`apps/web`) — o webpack do Next, em dev, compila
`app/` (RSC) e `app/api/**/route.ts` (route handler) como **layers**
diferentes, cada uma com sua própria cópia de cada módulo; duas cópias da
mesma classe não passam em `instanceof` uma da outra. `server/api.ts` compara
`err.name` (string) em vez de `instanceof` por causa disso — mantido mesmo após
achatar o monorepo (§1) porque `err.name` é mais robusto de qualquer forma, e
não custa nada.

---

## 7. Isolamento e comunicação entre módulos

Os módulos são **bounded contexts** por convenção de pasta — não há mais
fronteira de package/compilador entre eles (§1). O que os mantém isolados:

- **Sem barrel, import explícito.** `src/modules/kanban/components/kanban-card`
  é o caminho real — não existe um `@/modules/kanban` que esconda a estrutura
  interna. Isso também significa que romper o isolamento (kanban importar
  chat) aparece no `git diff` como um import cross-module óbvio, não como uma
  linha de `package.json`.
- **Comunicação só por eventos.** Um módulo **publica** eventos (ex: Kanban
  publica `card:moved`) e/ou **assina** eventos. Nunca chama o outro direto —
  com a exceção de `workspaces` (§3).
- **Integrações vivem na camada de composição (`src/server/`)**, não nos
  módulos. Ex: "quando o Kanban move um card, postar no Chat" é registrado em
  `src/server/kanban-chat.ts`, e é o **único** lugar (junto com
  `src/server/container.ts`) que conhece dois módulos ao mesmo tempo.
- **Se a disciplina precisar de reforço mecânico** (o projeto cresceu, uma
  violação real aconteceu), a ferramenta é `dependency-cruiser` — um arquivo de
  config que barra imports entre `src/modules/*` no CI. Não instalado
  preventivamente; é uma linha a puxar se/quando fizer falta (§11).

---

## 8. Sistema de eventos (`@/core/events`)

O event bus é a **base** — a fundação que liga os módulos sem acoplá-los.

- **`@/core/events/bus`** — o bus (publish/subscribe, tipado). MVP: in-process.
  Ponto de extensão para múltiplas instâncias (Redis pub/sub) é o `publish`.
- **`@/core/events/types`** — os **contratos** de evento (`KernoEventType`,
  payloads). Compartilhado por vários módulos — por isso vive no core, não num
  módulo.
- **Dispatcher** (`src/server/event-dispatcher.ts`) — assina *todos* os
  eventos e: (1) persiste na tabela `Event` (auditoria); (2) repassa para a
  room do workspace via Socket.io. Ligado uma vez no boot (`server.ts` →
  `initRealtime`).

---

## 9. Banco de dados

- **Um banco, um cliente Prisma** (`src/core/db.ts`). Monólito modular
  compartilha o banco — isso é o esperado.
- **Um arquivo `.prisma` por dono, todos na mesma pasta.** O Prisma gera UM
  client de UMA pasta (schema multi-arquivo, suportado nativamente desde o
  Prisma 5) — não precisa reunir fragmentos de módulos diferentes antes de
  gerar. `base.prisma`/`events.prisma` são do núcleo; `kanban.prisma`/
  `chat.prisma` são de cada hub, fisicamente colocados aqui só porque é onde o
  Prisma precisa que estejam, mas o dono lógico de cada um continua sendo o
  módulo cujo nome ele leva.

```
prisma/schema/
├─ base.prisma       # generator + datasource + User/Workspace
├─ events.prisma     # Event (log)
├─ kanban.prisma     # Board, Column, Card, Label — dono: modules/kanban
├─ chat.prisma       # Channel, Message — dono: modules/chat
└─ migrations/       # histórico versionado
```

- **Relações cruzadas → referência por id.** O ideal é o núcleo **não** listar
  `boards`/`channels` (hoje o `Workspace` lista — acoplamento a limpar). Hubs
  referenciam `workspaceId` por id, sem back-relation no núcleo. Limpeza
  **gradual**, não bloqueia o resto.

---

## 10. Camada de composição (`src/server/`)

Onde a API HTTP e o realtime vivem. **Não tem regra de negócio nem Prisma fora
dos módulos.** Ela orquestra. Um processo só: sem BFF, sem serviço separado,
sem token próprio — a sessão é o cookie do NextAuth.

- **`src/app/`** — rotas (páginas do Next + `app/api/[[...route]]/route.ts`,
  que monta a API Hono via `hono/vercel`).
- **`src/server/`**:
  - `container.ts` — instancia os serviços de todos os módulos (o único
    arquivo, junto com as integrações, que conhece mais de um módulo). Sem
    cache em `globalThis`: os serviços são funções puras por trás (sem estado
    próprio), então recriá-los no hot-reload do dev é barato e evita servir uma
    instância presa a um bundle antigo.
  - `api.ts` — monta o Hono (`basePath("/api")`), traduz erro de domínio → HTTP
    num lugar só (ver §6), registra os controllers de cada módulo.
  - `realtime.ts`, `event-dispatcher.ts`, `kanban-chat.ts` — Socket.io e as
    integrações entre módulos.
- **`src/core/auth/`** — a sessão NextAuth (cookie) e sua tradução pro mundo
  Hono (`middleware.ts` → `requireUser`) e pro handshake do socket
  (`session.ts` → `userIdFromCookieHeader`). `next-auth.ts` é o `NextAuth(...)`
  em si (provider Credentials); `config.ts` é a parte segura para edge
  (usada pelo `src/middleware.ts` do Next).
- **A fronteira (client.ts de cada módulo + as server actions) fica no
  módulo/app, nunca no domínio.** Server Components e actions chamam o
  *service* do módulo direto (via `container`, mesmo processo — sem HTTP).
  Client Components chamam o *client* do módulo, que fala com o *controller*
  Hono por `/api/...`. O domínio não conhece auth — a sessão chega pronta
  (`userId`) via o guard/middleware.

---

## 11. Evolução documentada

A camada de dados é um **caminho contínuo** — começamos leves e subimos só onde
doer, sem refazer:

1. **Service + Prisma-como-repo** ← *estado-alvo atual*.
2. **+ Repository** numa consulta específica, quando ela ficar complexa.
3. **+ Hexagonal** (interface + adapter Prisma) num módulo, quando precisar
   testar com fake ou trocar de infra.
4. **DDD tático** num módulo, se a regra de negócio ali ficar rica.
5. **+ dependency-cruiser** no CI, se a disciplina de "módulo nunca importa
   módulo" (§7) precisar de reforço mecânico (voltou a existir um monorepo,
   um time grande o bastante pra isso importar).

Observações:

- **CQRS-lite já existe acidentalmente:** o `KanbanCommand` + `runCommand` é um
  *command bus* (escrita); `getBoardSnapshot` → DTO é a leitura. Dá pra
  formalizar de leve quando fizer sentido.
- Cada passo acima é **local a um módulo** — não é decisão global.

---

## 12. Glossário rápido

- **Módulo / hub** — fatia vertical autocontida (Kanban, Chat, Workspaces).
  Bounded context por convenção de pasta.
- **DTO** — *Data Transfer Object*: formato serializável que cruza pro client.
- **Service** — autoriza (guards) e despacha para o domínio.
- **Domain** — o caso de uso de negócio ("mover card"): fala Prisma, publica
  evento, lança erro tipado.
- **Guard** — resolve "de quem é este recurso" e exige o papel mínimo.
- **Composition root** — onde os módulos são ligados entre si (`src/server/`).
- **Event bus** — canal publish/subscribe entre módulos (`@/core/events`).
