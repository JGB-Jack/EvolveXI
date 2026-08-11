"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ClipboardList, FileText, Settings, CircleUserRound } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/squad", label: "Squad", icon: Users },
  { href: "/sessions", label: "Sessions", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TAB_CLASSES =
  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background">
      <div className="mx-auto flex max-w-6xl">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(TAB_CLASSES, active ? "text-primary" : "text-muted-foreground")}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(TAB_CLASSES, "text-muted-foreground")}
              />
            }
          >
            <CircleUserRound className="size-5" />
            Profile
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
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
    </nav>
  );
}
