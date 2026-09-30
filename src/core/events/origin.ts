import { AsyncLocalStorage } from "node:async_hooks";
import type { EventOrigin } from "./types";

// Contexto assíncrono: qualquer evento criado (createEvent) durante `fn` — pelos domínios, nos
// fundos da pilha de chamadas — sai marcado com a origem, sem passar parâmetro por todas as
// funções. Só servidor (node:async_hooks); não importar daqui no cliente.
const storage = new AsyncLocalStorage<EventOrigin>();

export const withEventOrigin = <T>(origin: EventOrigin, fn: () => T): T => storage.run(origin, fn);
export const currentEventOrigin = (): EventOrigin | undefined => storage.getStore();
