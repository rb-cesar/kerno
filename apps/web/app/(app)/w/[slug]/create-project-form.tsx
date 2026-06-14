"use client";

import { useActionState } from "react";
import { Input, Textarea } from "@kerno/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { createProjectAction } from "./actions";

export function CreateProjectForm({
  workspaceId,
  slug,
}: {
  workspaceId: string;
  slug: string;
}) {
  const [state, action] = useActionState(createProjectAction, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="slug" value={slug} />
      <Input name="name" placeholder="Nome do projeto" required minLength={2} />
      <Textarea name="description" placeholder="Descrição (opcional)" rows={2} />
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Criar projeto</SubmitButton>
    </form>
  );
}
