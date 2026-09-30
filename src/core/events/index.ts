import { currentEventOrigin } from "./origin";
import type { KernoEvent, KernoEventMap, KernoEventType } from "./types";

export { eventBus } from "./bus";
export { withEventOrigin } from "./origin";
export * from "./types";

/** Helper para construir um evento bem-formado com timestamp. */
export function createEvent<T extends KernoEventType>(
  type: T,
  workspaceId: string,
  payload: KernoEventMap[T],
  userId?: string,
): KernoEvent<T> {
  const origin = currentEventOrigin();
  return {
    type,
    workspaceId,
    userId,
    payload,
    ...(origin ? { origin } : {}),
    at: new Date().toISOString(),
  };
}
