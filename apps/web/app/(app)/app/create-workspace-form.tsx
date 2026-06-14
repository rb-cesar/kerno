"use client";

import { useActionState } from "react";
import { Input } from "@kerno/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { createWorkspaceAction } from "./actions";

export function CreateWorkspaceForm() {
  const [state, action] = useActionState(createWorkspaceAction, null);

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <Input name="name" placeholder="Nome do novo workspace" required minLength={2} />
        {state?.error ? (
          <p className="mt-1 text-sm text-destructive">{state.error}</p>
        ) : null}
      </div>
      <SubmitButton>Criar workspace</SubmitButton>
    </form>
  );
}
