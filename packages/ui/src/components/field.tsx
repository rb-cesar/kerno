"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../utils";
import { Label } from "./label";

type FieldContextValue = {
  id: string;
  hintId: string;
  errorId: string;
  invalid: boolean;
  hasHint: boolean;
  hasError: boolean;
  setHasHint: (v: boolean) => void;
  setHasError: (v: boolean) => void;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useFieldContext(): FieldContextValue {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("Componentes de Field devem ser usados dentro de <Field>.");
  return ctx;
}

/**
 * Wiring de acessibilidade do campo. Use em controles que não passam por
 * <FieldControl> (ex.: o gatilho de um Select customizado):
 * `<SelectTrigger {...useField()} />`.
 */
export function useField() {
  const { id, hintId, errorId, invalid, hasHint, hasError } = useFieldContext();
  const describedBy =
    [hasHint ? hintId : null, hasError ? errorId : null].filter(Boolean).join(" ") || undefined;
  return {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
  } as const;
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Marca o campo como inválido (também ativado automaticamente quando há <FieldError>). */
  invalid?: boolean;
}

/** Container que padroniza Label + controle + dica/erro e liga o aria automaticamente. */
const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, invalid = false, ...props }, ref) => {
    const base = React.useId();
    const [hasHint, setHasHint] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    const value = React.useMemo<FieldContextValue>(
      () => ({
        id: `${base}-control`,
        hintId: `${base}-hint`,
        errorId: `${base}-error`,
        invalid: invalid || hasError,
        hasHint,
        hasError,
        setHasHint,
        setHasError,
      }),
      [base, invalid, hasHint, hasError],
    );

    return (
      <FieldContext.Provider value={value}>
        <div ref={ref} className={cn("space-y-2", className)} {...props} />
      </FieldContext.Provider>
    );
  },
);
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>((props, ref) => {
  const { id } = useFieldContext();
  return <Label ref={ref} htmlFor={id} {...props} />;
});
FieldLabel.displayName = "FieldLabel";

/** Injeta id/aria-describedby/aria-invalid no controle filho (via Slot). */
const FieldControl = React.forwardRef<HTMLElement, { children: React.ReactElement }>(
  ({ children }, ref) => {
    const field = useField();
    return (
      <Slot ref={ref} {...field}>
        {children}
      </Slot>
    );
  },
);
FieldControl.displayName = "FieldControl";

const FieldHint = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { hintId, setHasHint } = useFieldContext();
    React.useEffect(() => {
      setHasHint(true);
      return () => setHasHint(false);
    }, [setHasHint]);
    return (
      <p ref={ref} id={hintId} className={cn("text-xs text-muted-foreground", className)} {...props} />
    );
  },
);
FieldHint.displayName = "FieldHint";

const FieldError = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { errorId, setHasError } = useFieldContext();
    React.useEffect(() => {
      setHasError(true);
      return () => setHasError(false);
    }, [setHasError]);
    if (!children) return null;
    return (
      <p
        ref={ref}
        id={errorId}
        role="alert"
        className={cn("text-sm text-destructive", className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);
FieldError.displayName = "FieldError";

export { Field, FieldLabel, FieldControl, FieldHint, FieldError };
