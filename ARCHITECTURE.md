# Arquitetura do Kerno

> Documento de referência. Define **como o código é organizado** e **por quê**.
> Decisões aqui valem para todo o projeto; mudanças de arquitetura passam por
> atualizar este arquivo primeiro.

---

## 1. Visão geral

O Kerno é um **monólito modular**: uma única aplicação, organizada em **módulos
isolados** (fatias verticais) que se comunicam **apenas por eventos**.

- Não há separação física de backend/frontend. A fronteira é **lógica**: o DTO
  (formato serializável) + a diretiva `"use server"` marcam onde o "lado
  servidor" para e o "lado cliente" começa — mesmo sendo um código só.
- Não há separação física de banco por módulo. Quem desacopla os módulos é o
  **event bus**, não o banco. Um banco e um cliente Prisma só.
- É um **monorepo pnpm**. Cada módulo e cada peça do núcleo é um *package*. O app
  Next é apenas a casca de entrega.

Estilos de referência: **monólito modular + vertical slices + comunicação por
eventos**. Na camada de dados, **Service + Mapper + DTO** (Prisma como
repositório). Veja §6 e §11 para a evolução possível.

---

## 2. Estrutura de pastas

```
kerno/
├─ pnpm-workspace.yaml
├─ apps/
│  └─ web/                 # @kerno/web — casca de entrega (Next.js)
│     ├─ app/              #   SÓ ROTAS: cada page/layout é um atalho fino
│     ├─ composition/      #   wiring de boot (liga bus ↔ Socket.io, integrações)
│     └─ server.ts
└─ packages/
   ├─ core/                # BASE FIXA — o que sempre existe
   │  ├─ events/           #   @kerno/events — event bus + contratos (módulo base)
   │  ├─ db/               #   @kerno/db — Prisma client + schema
   │  ├─ ui/               #   @kerno/ui — design system
   │  ├─ auth/             #   @kerno/auth — sessão + permissões
   │  └─ workspaces/       #   @kerno/workspaces — núcleo de domínio (projeto/membro)
   └─ modules/             # REMOVÍVEL — os hubs de produto
      ├─ kanban/           #   @kerno/kanban
      └─ chat/             #   @kerno/chat
```

```yaml
# pnpm-workspace.yaml — a única coisa estrutural; o nome das pastas é convenção
packages:
  - "apps/*"
  - "packages/core/*"
  - "packages/modules/*"
```

O topo se explica sozinho: **`apps` (o que sobe pra produção) · `core` (base
fixa) · `modules` (hubs).**

---

## 3. A régua: `core/` vs `modules/`

A pergunta que decide onde uma coisa mora:

> **Dá pra adicionar/remover sem quebrar o Kerno?**
> - **Sim** → é um hub de produto → `packages/modules/`.
> - **Não, sempre existe** → é base → `packages/core/`.

Por isso `events`, `db`, `ui`, `auth` e `workspaces` (projeto/membro) são
**core**: o Kerno não existe sem eles. Kanban e Chat são **modules**: um time
pode ativar ou não.

---

## 4. Forma padrão de um módulo

Todo módulo (hub ou peça de domínio do core) segue o mesmo esqueleto. Forma
previsível = você sempre sabe onde procurar.

```
packages/modules/kanban/src/
├─ index.ts          # API PÚBLICA — o único ponto importável de fora
├─ types.ts          # DTOs — o contrato que cruza pro client
├─ services/         # casos de uso (fala Prisma direto; publica eventos)
├─ mappers/          # linha Prisma → DTO (funções puras)
├─ domain/           # regras/entidades puras (OPCIONAL, só onde há regra real)
├─ actions.ts        # fronteira "use server"
└─ ui/               # componentes React (client)
```

Regras:

- **Nada importa o miolo de um módulo.** De fora, só `index.ts`. Isso permite
  reorganizar o interior sem quebrar ninguém.
- **Um módulo nunca importa outro módulo.** Kanban não conhece Chat. Comunicação
  só por eventos (§7).
- Um módulo pode depender do **core** (`@kerno/db`, `@kerno/ui`, `@kerno/events`).

---

## 5. Camadas de dados (Service + Mapper + DTO)

Uma mesma entidade tem **3 formatos** conforme a camada. Confundir os três é a
origem da bagunça.

| Formato | O que é | Onde vive |
|---------|---------|-----------|
| **Modelo (Prisma)** | a linha do banco, com FKs | `core/db` (schema) — interno |
| **Entidade / domínio** *(opcional)* | regras e invariantes puras | `modules/<m>/domain` |
| **DTO** | formato serializável, enriquecido | `modules/<m>/types.ts` — público |

Fluxo de uma requisição:

```
UI (client)  ──DTO──►  actions.ts (boundary, "use server")
                          └─► service (caso de uso)
                                ├─ fala Prisma direto  ◄── Prisma É o repositório
                                ├─ aplica regra (domain, se houver)
                                ├─ publica evento (eventBus)
                                └─ mapper: linha Prisma → DTO
                          ◄──DTO── volta pro client
```

Papéis:

- **Service** — orquestra a operação. Lê/escreve via Prisma, aplica regra,
  publica eventos, devolve **DTO** (via mapper). Não conhece React.
- **Mapper** — função pura que converte linha Prisma → DTO. Pode começar ao lado
  do service; vira pasta quando crescer.
- **DTO (`types.ts`)** — o contrato. Nunca contém tipos do Prisma.
- **Domain** — só quando há regra de verdade (ex: "projeto precisa de ≥1 lead",
  ordenação de cards). Modelo anêmico (Prisma como dado + service com a lógica)
  é **legítimo** para CRUD simples.
- **Boundary (`actions.ts`)** — `auth → permissão → chama service → devolve`.
  Fina; traduz `Error` do domínio em `{ ok: false, error }` para a UI.

### Por que não há camada `repository/`

O **Prisma client já é um data-mapper** — ele é o repositório. Embrulhá-lo num
repository à mão é redundante em CRUD. Os services falam Prisma direto.
> Evolução: se uma consulta ficar complexa/repetida, extraia **só ela** para um
> `repository/`. Não precisa fazer pra tudo. Veja §11.

---

## 6. A regra de ouro

> **Dependência só aponta pra baixo. O Prisma nunca sai da camada de service.
> Só o DTO cruza a linha do `"use server"`.**

Consequências verificáveis:

- Um componente em `ui/` **nunca** importa `@kerno/db`. (Candidato a trava de
  lint.)
- Um DTO **nunca** expõe um tipo gerado pelo Prisma.
- `domain/` não importa Prisma nem React (é puro → testável sem banco).

---

## 7. Isolamento e comunicação entre módulos

Os módulos são **bounded contexts**. Eles não se conhecem.

- **API pública via `index.ts`.** Importar `@kerno/kanban` (não o caminho
  interno) é a única forma permitida.
- **Comunicação só por eventos.** Um módulo **publica** eventos (ex: Kanban
  publica `card:moved`) e/ou **assina** eventos. Nunca chama o outro direto.
- **Integrações vivem na camada de composição do app**, não nos módulos. Ex:
  "quando o Kanban move um card, postar no Chat" é registrado em
  `apps/web/composition/`, e é o **único** lugar que conhece dois módulos ao
  mesmo tempo.

---

## 8. Sistema de eventos (`core/events`)

O event bus é o **módulo base** — a fundação que liga tudo sem acoplar.

- **`@kerno/events`** — o bus (publish/subscribe, tipado) + os **contratos** de
  evento (`KernoEventType`, payloads). MVP: in-process. Ponto de extensão para
  múltiplas instâncias (Redis pub/sub) é o `publish`.
- **Dispatcher** (`apps/web/composition`) — assina *todos* os eventos e: (1)
  persiste na tabela `Event` (auditoria); (2) repassa para a room do projeto via
  Socket.io. Ligado uma vez no boot (`server.ts`).
- **Contratos no core, não nos módulos.** Um tipo de evento é compartilhado por
  ≥2 módulos → mora em `@kerno/events`.

---

## 9. Banco de dados

- **Um banco, um cliente Prisma** (`@kerno/db`). Monólito modular compartilha o
  banco — isso é o esperado.
- **Schema fatiado por módulo** (multi-file schema do Prisma): cada módulo é dono
  do seu `.prisma`, e o Prisma funde tudo num cliente central.

```
packages/core/db/prisma/schema/
├─ base.prisma      # generator + datasource + User/Workspace/Project (núcleo)
├─ kanban.prisma    # Board, Column, Card, Label   ← dono: módulo kanban
├─ chat.prisma      # Channel, Message             ← dono: módulo chat
└─ events.prisma    # Event (log)
```

- **Relações cruzadas → referência por id.** O ideal é o núcleo **não** listar
  `boards`/`channels` (hoje o `Project` lista — acoplamento a limpar). Hubs
  referenciam `projectId` por id, sem back-relation no núcleo. Limpeza
  **gradual**, não bloqueia o resto.

---

## 10. Camada de entrega (`apps/web`)

A casca Next. **Não tem regra de negócio nem Prisma.** Ela orquestra.

- **`app/` = só rotas.** Cada `page.tsx`/`layout.tsx` é um atalho que re-exporta
  a tela do módulo (única fragmentação inevitável — regra do Next):

  ```tsx
  // app/w/[slug]/p/[id]/kanban/page.tsx
  export { default } from "@kerno/kanban/page";
  ```

- **`composition/`** — wiring de boot: dispatcher de eventos + integrações entre
  hubs. Invocado por `server.ts`.
- **Server actions** moram **no módulo** (`modules/<m>/actions.ts`). Se o Next
  reclamar de `"use server"` em package, o plano B é um re-export fino em `app/`.

---

## 11. Evolução documentada

A camada de dados é um **caminho contínuo** — começamos leves e subimos só onde
doer, sem refazer:

1. **Service + Prisma-como-repo** ← *estado-alvo atual*.
2. **+ Repository** numa consulta específica, quando ela ficar complexa.
3. **+ Hexagonal** (interface + adapter Prisma) num módulo, quando precisar
   testar com fake ou trocar de infra.
4. **DDD tático** num módulo, se a regra de negócio ali ficar rica.

Observações:

- **CQRS-lite já existe acidentalmente:** o `KanbanCommand` + `kanbanMutate` é um
  *command bus* (escrita); `getBoardSnapshot` → DTO é a leitura. Dá pra
  formalizar de leve quando fizer sentido.
- Cada passo acima é **local a um módulo** — não é decisão global.

---

## 12. Glossário rápido

- **Módulo / hub** — fatia vertical autocontida (Kanban, Chat). Bounded context.
- **DTO** — *Data Transfer Object*: formato serializável que cruza pro client.
- **Service / caso de uso** — uma operação de negócio ("mover card").
- **Mapper** — converte linha Prisma → DTO.
- **Boundary** — a porta de entrada server (`actions.ts`, `"use server"`).
- **Composition root** — onde os módulos são ligados entre si (`apps/web/composition`).
- **Event bus** — canal publish/subscribe entre módulos (`@kerno/events`).
```
