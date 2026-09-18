"use client";

import { LogOut, Palette } from "lucide-react";
import { useState } from "react";
import { ThemePicker } from "@/components/theme/theme-picker";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { signOutAction } from "@/core/auth/actions";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({
  name,
  email,
  side = "bottom",
  align = "end",
}: {
  name: string;
  email: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none ring-ring focus-visible:ring-2">
            <Avatar>
              <AvatarFallback>{initialsOf(name)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side={side} align={align}>
          <DropdownMenuLabel>
            <div>{name}</div>
            <div className="text-xs font-normal text-muted-foreground">{email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            // preventDefault: abre o dialog sem que o fechamento do menu o cancele.
            onSelect={(e) => {
              e.preventDefault();
              setThemeOpen(true);
            }}
          >
            <Palette />
            Aparência
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                <LogOut />
                Sair
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemePicker open={themeOpen} onOpenChange={setThemeOpen} />
    </>
  );
}
