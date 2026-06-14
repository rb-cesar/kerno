"use client";

import { useState, useTransition } from "react";
import { SendHorizonal } from "lucide-react";
import { Button, Input } from "@kerno/ui";

export function MessageComposer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = content.trim();
    if (!value) return;
    setContent("");
    startTransition(async () => {
      await onSend(value);
    });
  };

  return (
    <div className="flex items-center gap-2 border-t p-3">
      <Input
        value={content}
        placeholder="Escreva uma mensagem…"
        disabled={disabled || pending}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <Button size="icon" disabled={disabled || pending} onClick={submit}>
        <SendHorizonal />
      </Button>
    </div>
  );
}
