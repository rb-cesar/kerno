"use client";

import { type UseMutationResult, useMutation } from "@tanstack/react-query";

/**
 * Embrulha uma função de mutação (uma por ação, ou o canal genérico único do
 * kanban) em `useMutation`, sem exigir erro por exceção — o envelope
 * `{ok, error}` que os clients já devolvem continua chegando intacto em
 * `onSuccess`; `onError` só dispara se a promise de fato rejeitar (o que já
 * acontece hoje pra funções que não fazem `.catch()` próprio, como
 * `notificationsClient.markRead`).
 *
 * Sem invalidação automática por tipo de comando: no canal genérico do
 * kanban, os comandos carregam cardId/columnId, não necessariamente a chave
 * do recurso afetado — cabe ao call site invalidar via `onSuccess`, que já
 * sabe o contexto (ex.: qual board está aberto).
 */
export class MutationChannel<TCommand, TResult> {
  constructor(private config: { mutate: (command: TCommand) => Promise<TResult> }) {}

  useMutation = (overrides?: {
    onMutate?: (command: TCommand) => void;
    onSuccess?: (result: TResult, command: TCommand) => void;
    onError?: (error: unknown, command: TCommand) => void;
  }): UseMutationResult<TResult, unknown, TCommand> =>
    useMutation({
      mutationFn: this.config.mutate,
      onMutate: overrides?.onMutate,
      onSuccess: overrides?.onSuccess,
      onError: overrides?.onError,
    });
}
