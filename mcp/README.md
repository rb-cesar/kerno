# Kerno MCP

[MCP](https://modelcontextprotocol.io) pessoal: deixa o Claude ler e escrever nos workspaces, kanban e chat do
Kerno. As tools moram em `src/server/mcp/` e falam com os **mesmos serviços do app**
(`src/server/container.ts`); o que muda é o transporte:

| Modo | Onde roda | Banco | Quando usar |
| --- | --- | --- | --- |
| **HTTP** — `POST /api/mcp` | dentro do servidor do app (Render) | o do app | produção; veja [DEPLOY.md](../DEPLOY.md#3-mcp-pessoal-opcional) |
| **stdio** — `mcp/server.ts` | processo local | `DATABASE_URL` do `.env` | desenvolver contra o Postgres local |

Nos dois, o MCP age **como um usuário** e as regras do app valem igual: só vê workspaces onde é membro, `VIEWER`
não escreve, só `ADMIN` gerencia membros.

## Tools

| Tipo | Tools |
| --- | --- |
| Leitura | `list_workspaces`, `get_workspace`, `get_board`, `list_column_cards`, `search_cards`, `get_card`, `get_board_metrics` |
| Workspace | `create_workspace`, `invite_member`, `set_member_role`, `remove_member` |
| Cards | `create_card`, `update_card`, `move_card`, `delete_card`, `add_comment`, `create_subtask` |
| Resto do kanban | `kanban_command` — qualquer `KanbanCommand` (boards, colunas, labels, cycles, stories, checklists) |
| Chat (leitura) | `list_channels`, `read_channel_messages`, `read_direct_messages` |
| Chat (escrita) | `send_message`, `send_direct_message`, `open_direct`, `edit_message`, `react_to_message`, `create_channel` |

Onde um card é pedido, aceita o **id** ou a referência **`KEY-N`** (ex.: `KERN-12`) junto com `workspace` (slug).
`move_card` aceita o **nome** da coluna de destino. Mensagens de chat saem **em nome do usuário** — o Claude deve
confirmar o texto antes de enviar.

## Modo HTTP (produção)

Endpoint opt-in: só existe com `KERNO_MCP_TOKEN` (≥ 32 caracteres) e `KERNO_MCP_USER_EMAIL` definidos no servidor;
sem elas responde 404. Autenticação por `Authorization: Bearer <token>` (comparação em tempo constante), só `POST`.
Como roda no processo do servidor, o event bus alimenta o Socket.io: quem está com o app aberto vê as mudanças em
tempo real, e notificações/auditoria/anúncio Kanban→Chat acontecem como se o usuário tivesse agido pela UI.

Passo a passo de envs e registro no Claude Code: [DEPLOY.md](../DEPLOY.md#3-mcp-pessoal-opcional).

## Modo stdio (local)

`KERNO_USER_EMAIL` define o usuário. **Só aceita banco local** por padrão: se `DATABASE_URL` não for
`localhost`/`127.0.0.1`, recusa subir a menos que `KERNO_MCP_ALLOW_REMOTE=1`. Sem servidor Socket.io no processo,
o push em tempo real não acontece (quem estiver com o app aberto vê a mudança ao recarregar); auditoria,
notificações e anúncio Kanban→Chat continuam valendo.

```bash
claude mcp add kerno --scope local -e KERNO_USER_EMAIL=voce@exemplo.com -- node --import tsx --env-file=.env mcp/server.ts
```

Precisa do Postgres no ar (`pnpm docker:up`). Servidores MCP são carregados no início da sessão — depois de
registrar, abra uma sessão nova. Para remover: `claude mcp remove kerno --scope local`.

## Testes

`pnpm vitest run src/server/mcp` — integração contra o Postgres local: cliente MCP ↔ tools ↔ serviços ↔ banco, e o
handler HTTP com o cliente MCP real (cria e apaga os próprios dados, como os testes de service).
