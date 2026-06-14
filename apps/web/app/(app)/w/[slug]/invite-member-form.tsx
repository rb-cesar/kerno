"use client";

import { useActionState } from "react";
import { Input } from "@kerno/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { inviteMemberAction } from "./actions";

export function InviteMemberForm({
  workspaceId,
  slug,
}: {
  workspaceId: string;
  slug: string;
}) {
  const [state, action] = useActionState(inviteMemberAction, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="email"
          type="email"
          placeholder="email@exemplo.com"
          required
          className="flex-1"
        />
        <select
          name="role"
          defaultValue="MEMBER"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="MEMBER">Membro</option>
          <option value="ADMIN">Admin</option>
        </select>
        <SubmitButton variant="secondary">Convidar</SubmitButton>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-500">{state.success}</p> : null}
    </form>
  );
}
