"use client";

import { useState, useTransition } from "react";
import { UserPlus, Users, X } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kerno/ui";
import {
  inviteWorkspaceMember,
  removeWorkspaceMember,
} from "@/lib/workspace-members-actions";

type Member = { id: string; name: string; role: string };
type Role = "ADMIN" | "MEMBER" | "VIEWER";
type Result = { ok: true; message?: string } | { ok: false; error: string };

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function WorkspaceMembersDialog({
  workspaceId,
  slug,
  isManager,
  members,
}: {
  workspaceId: string;
  slug: string;
  isManager: boolean;
  members: Member[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");

  const run = (action: () => Promise<Result>) =>
    startTransition(async () => {
      setError(null);
      const res = await action();
      if (!res.ok) setError(res.error);
    });

  const invite = () => {
    const value = email.trim();
    if (!value) return;
    run(async () => {
      const res = await inviteWorkspaceMember({ workspaceId, slug, email: value, role });
      if (res.ok) setEmail("");
      return res;
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users /> Membros
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Membros do workspace</DialogTitle>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.role.toLowerCase()}</div>
              </div>
              {isManager ? (
                <button
                  disabled={pending}
                  onClick={() => run(() => removeWorkspaceMember({ workspaceId, slug, userId: m.id }))}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  title="Remover do workspace"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {isManager ? (
          <div className="space-y-2 border-t pt-3">
            <div className="text-sm font-medium text-muted-foreground">Convidar membro</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Membro</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="VIEWER">Leitor</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" disabled={pending} onClick={invite}>
                <UserPlus /> Convidar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No MVP, só é possível convidar quem já tem conta no Kerno.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Apenas administradores do workspace podem gerenciar membros.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
