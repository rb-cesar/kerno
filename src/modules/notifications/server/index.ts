// @/modules/notifications/server — lado servidor do módulo Notifications:
// controller Hono + domínio. O domínio também é usado por
// server/notification-dispatcher.ts (composição do app), que é quem decide
// *quem* recebe notificação de um evento de outro hub — este módulo não
// conhece Kanban nem Chat.
export { createNotificationController } from "./controller";
export { notificationDomain } from "./domain";
export { createNotificationService, type NotificationService } from "./service";
