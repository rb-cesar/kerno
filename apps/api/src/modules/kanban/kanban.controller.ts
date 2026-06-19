import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import type { KanbanCommand } from "@kerno/contracts/kanban";
import { CurrentUser } from "../../core/auth/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/jwt-auth.guard";
import type { RequestUser } from "../../core/auth/jwt.strategy";
import { KanbanService } from "./kanban.service";

@UseGuards(JwtAuthGuard)
@Controller("kanban")
export class KanbanController {
  constructor(private readonly kanban: KanbanService) {}

  /** Board padrão do projeto — carga inicial da tela. */
  @Get("projects/:projectId/board")
  boardForProject(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.kanban.boardForProject(user.id, projectId);
  }

  /** Snapshot de um board — refetch após eventos. */
  @Get("boards/:boardId")
  snapshot(@CurrentUser() user: RequestUser, @Param("boardId") boardId: string) {
    return this.kanban.snapshot(user.id, boardId);
  }

  /** Detalhe de um card (sub-tarefas, comentários, atividade) — sob demanda. */
  @Get("cards/:cardId/detail")
  cardDetail(@CurrentUser() user: RequestUser, @Param("cardId") cardId: string) {
    return this.kanban.cardDetail(user.id, cardId);
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
