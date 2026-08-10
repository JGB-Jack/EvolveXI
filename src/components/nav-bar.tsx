"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, ClipboardList, FileText } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/squad", label: "Squad", icon: Users },
  { href: "/sessions", label: "Sessions", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function NavBar({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : email[0]?.toUpperCase();

  return (
    <header className="bg-primary">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/home"
          className="shrink-0 text-lg font-semibold tracking-tight text-primary-foreground"
        >
          EvolveXI
        </Link>
        {pathname !== "/home" && (
          <nav className="flex items-center gap-2">
            {NAV_ITEMS.filter(
              (item) =>
                pathname !== item.href &&
                !pathname.startsWith(`${item.href}/`),
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                <item.icon className="size-6" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-1">
          <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="gap-2 px-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              />
            }
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm md:inline">{name || email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                Sign out
              </button>
            </form>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
