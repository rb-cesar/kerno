"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@kerno/ui";

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? "Aguarde…" : children}
    </Button>
  );
}
