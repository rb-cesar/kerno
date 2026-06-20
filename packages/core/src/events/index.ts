import type {
  KernoEvent,
  KernoEventMap,
  KernoEventType,
} from "../types";

export { eventBus } from "./bus";

/** Helper para construir um evento bem-formado com timestamp. */
export function createEvent<T extends KernoEventType>(
  type: T,
  workspaceId: string,
  payload: KernoEventMap[T],
  userId?: string,
): KernoEvent<T> {
  return {
    type,
    workspaceId,
    userId,
    payload,
    at: new Date().toISOString(),
  };
}
