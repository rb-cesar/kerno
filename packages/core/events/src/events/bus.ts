import { EventEmitter } from "node:events";
import type { AnyKernoEvent, KernoEvent, KernoEventType } from "@kerno/types";

type Handler<T extends KernoEventType> = (event: KernoEvent<T>) => void | Promise<void>;
type AnyHandler = (event: AnyKernoEvent) => void | Promise<void>;

const WILDCARD = "*";

/**
 * Event bus tipado, padrão publish-subscribe.
 *
 * MVP: in-process (uma única instância de servidor). O ponto de extensão para
 * múltiplas instâncias (Redis pub/sub) é o método `publish` — basta espelhar o
 * evento para o transporte externo aqui.
 */
class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  publish<T extends KernoEventType>(event: KernoEvent<T>): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit(WILDCARD, event);
  }

  on<T extends KernoEventType>(type: T, handler: Handler<T>): () => void {
    this.emitter.on(type, handler as AnyHandler);
    return () => this.emitter.off(type, handler as AnyHandler);
  }

  onAny(handler: AnyHandler): () => void {
    this.emitter.on(WILDCARD, handler);
    return () => this.emitter.off(WILDCARD, handler);
  }
}

// Singleton resiliente a hot-reload (dev) — sobrevive a recompilações do módulo.
const globalForBus = globalThis as unknown as { kernoBus?: EventBus };
export const eventBus = globalForBus.kernoBus ?? new EventBus();
globalForBus.kernoBus = eventBus;
