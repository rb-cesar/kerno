import type {
  KernoEvent,
  KernoEventMap,
  KernoEventType,
} from "../types";

export { eventBus } from "./bus";

/** Helper para construir um evento bem-formado com timestamp. */
export function createEvent<T extends KernoEventType>(
  type: T,
  projectId: string,
  payload: KernoEventMap[T],
  userId?: string,
): KernoEvent<T> {
  return {
    type,
    projectId,
    userId,
    payload,
    at: new Date().toISOString(),
  };
}
