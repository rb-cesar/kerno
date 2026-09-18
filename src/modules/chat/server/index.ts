// @/modules/chat/server — lado servidor do módulo Chat: controller Hono +
// domínio. Além do controller/serviço, expõe a superfície usada pela composição
// do app (integração Kanban→Chat posta mensagem de sistema no canal padrão).
export { createChatController } from "./controller";
export { defaultChannelId, postSystemMessage } from "./domain";
export { type ChatService, createChatService } from "./service";
