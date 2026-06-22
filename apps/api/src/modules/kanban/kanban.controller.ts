import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { KanbanCommand } from "@kerno/contracts/kanban";
import { CurrentUser } from "../../core/auth/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/jwt-auth.guard";
import type { RequestUser } from "../../core/auth/jwt.strategy";
import { KanbanService } from "./kanban.service";

@UseGuards(JwtAuthGuard)
@Controller("kanban")
export class KanbanController {
  constructor(private readonly kanban: KanbanService) {}

  /** Board padrão do workspace — carga inicial da tela. */
  @Get("workspaces/:workspaceId/board")
  boardForWorkspace(@CurrentUser() user: RequestUser, @Param("workspaceId") workspaceId: string) {
    return this.kanban.boardForWorkspace(user.id, workspaceId);
  }

  /** Snapshot de um board — refetch após eventos. */
  @Get("boards/:boardId")
  snapshot(@CurrentUser() user: RequestUser, @Param("boardId") boardId: string) {
    return this.kanban.snapshot(user.id, boardId);
  }

  /** Busca tarefas do workspace por KERN-N/título — menção `!` no chat. */
  @Get("workspaces/:workspaceId/cards/search")
  searchCards(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Query("q") q: string,
  ) {
    return this.kanban.searchCards(user.id, workspaceId, q ?? "");
  }

  /** Detalhe de um card (sub-tarefas, comentários, atividade) — sob demanda. */
  @Get("cards/:cardId/detail")
  cardDetail(@CurrentUser() user: RequestUser, @Param("cardId") cardId: string) {
    return this.kanban.cardDetail(user.id, cardId);
  }

  /** Snapshot do board que contém um card — painel da tarefa aberto pelo chat. */
  @Get("cards/:cardId/board")
  cardBoard(@CurrentUser() user: RequestUser, @Param("cardId") cardId: string) {
    return this.kanban.cardBoard(user.id, cardId);
  }

  /** Métricas de fluxo do board. */
  @Get("boards/:boardId/metrics")
  metrics(@CurrentUser() user: RequestUser, @Param("boardId") boardId: string) {
    return this.kanban.metrics(user.id, boardId);
  }

  /** Mutação única (command pattern). Retorna KanbanMutationResult. */
  @Post("commands")
  @HttpCode(200)
  runCommand(@CurrentUser() user: RequestUser, @Body() command: KanbanCommand) {
    return this.kanban.runCommand(user.id, command);
  }
}
