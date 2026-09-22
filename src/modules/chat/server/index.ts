// @/modules/chat/server — lado servidor do módulo Chat: controller Hono +
// domínio. Além do controller/serviço, expõe a superfície usada pela composição
// do app (integração Kanban→Chat posta mensagem de sistema no canal padrão).
export { createChatController } from "./controller";
export { chatDomain } from "./domain";
export { chatGuards } from "./guards";
export { type ChatService, createChatService } from "./service";
