"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "../utils";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const ISO = "yyyy-MM-dd";

export interface DatePickerProps extends React.AriaAttributes {
  /** Data no formato ISO `yyyy-MM-dd` (compatível com o `<input type="date">` nativo). */
  value?: string;
  /** Recebe a data selecionada no mesmo formato ISO, ou string vazia ao limpar. */
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

function isoToDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, ISO, new Date());
  return isValid(d) ? d : undefined;
}

/**
 * Seletor de data temático que substitui o `<input type="date">` nativo.
 * Mantém o valor em string ISO (`yyyy-MM-dd`) para não impactar a camada de dados.
 */
const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  { value, onChange, placeholder = "Selecionar data", disabled, className, id, name, ...aria },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  const selected = isoToDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={ref}
        id={id}
        type="button"
        disabled={disabled}
        {...aria}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
        <span className="line-clamp-1 flex-1">
          {selected ? format(selected, "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange?.(date ? format(date, ISO) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
    </Popover>
  );
});
DatePicker.displayName = "DatePicker";

export { DatePicker };
