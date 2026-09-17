"use client";

import { Button, type ButtonProps } from "@kerno/ui";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? "Aguarde…" : children}
    </Button>
  );
}
