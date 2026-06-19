import * as React from "react";
import { cn } from "../utils";

/** Placeholder pulsante para estados de carregamento. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
