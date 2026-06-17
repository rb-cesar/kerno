// @kerno/contracts — superfície pública. Tipos puros compartilhados entre
// backend, frontend e futuros apps cliente. Zero dependência de runtime.

export * from "./common";
export * from "./events";

// Re-exports explícitos (MemberDTO já vem de ./common — evita colisão).
export type {
  LabelDTO,
  CardDTO,
  ColumnDTO,
  BoardData,
  KanbanCommand,
  KanbanMutationResult,
} from "./kanban";

export type {
  ChannelDTO,
  MessageDTO,
  ChatData,
  ChatResult,
  SendMessageInput,
  CreateChannelInput,
} from "./chat";

export type {
  WorkspaceListItem,
  WorkspaceMemberDTO,
  ProjectListItem,
  WorkspaceDetail,
  ProjectMemberDTO,
  ProjectView,
  CreateWorkspaceInput,
  CreateProjectInput,
  InviteMemberInput,
  ActionResult,
} from "./workspaces";
