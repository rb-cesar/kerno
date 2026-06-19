"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { cn } from "../utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Wrapper de react-day-picker com os tokens do design system. Por padrão usa
 * locale pt-BR e navegação com ícones lucide.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn(defaults.months, "relative flex flex-col gap-4 sm:flex-row"),
        month: cn(defaults.month, "flex flex-col gap-4"),
        month_caption: cn(defaults.month_caption, "flex h-9 items-center justify-center px-9"),
        caption_label: cn(defaults.caption_label, "text-sm font-medium capitalize"),
        nav: cn(defaults.nav, "absolute inset-x-0 top-0 flex items-center justify-between"),
        button_previous: cn(
          defaults.button_previous,
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30",
        ),
        button_next: cn(
          defaults.button_next,
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30",
        ),
        month_grid: cn(defaults.month_grid, "w-full border-collapse"),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(defaults.weekday, "w-9 text-[0.8rem] font-normal text-muted-foreground"),
        week: cn(defaults.week, "mt-2 flex w-full"),
        day: cn(defaults.day, "h-9 w-9 p-0 text-center text-sm"),
        day_button: cn(
          defaults.day_button,
          "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-selected:opacity-100",
        ),
        selected: cn(
          defaults.selected,
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        ),
        today: cn(defaults.today, "[&>button]:bg-accent [&>button]:text-accent-foreground"),
        outside: cn(defaults.outside, "text-muted-foreground opacity-50"),
        disabled: cn(defaults.disabled, "text-muted-foreground opacity-50"),
        hidden: cn(defaults.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls, ...rest }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-4 w-4", cls)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
