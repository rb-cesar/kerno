// @kerno/chat/api — lado servidor do módulo Chat (NestJS): controller + domínio.
// Além do ChatApiModule, expõe a superfície usada pela composição do app
// (integração Kanban→Chat posta mensagem de sistema no canal padrão).

export { ChatApiModule } from "./chat.module";
export { defaultChannelId, postSystemMessage } from "./services";
