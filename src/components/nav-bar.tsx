"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CircleUserRound } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavBar() {
  const pathname = usePathname();
  const showHome = pathname !== "/home";

  return (
    <header className="primary-gradient sticky top-0 z-40">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
        <div>
          {showHome && (
            <Link
              href="/home"
              className="inline-flex items-center text-primary-foreground/90 hover:text-primary-foreground"
            >
              <Home className="size-5" />
            </Link>
          )}
        </div>
        <span className="text-xl font-semibold tracking-tight text-primary-foreground">
          EvolveXI
        </span>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Profile"
                  className="inline-flex items-center text-primary-foreground/90 hover:text-primary-foreground"
                />
              }
            >
              <CircleUserRound className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link
                href="/settings"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                Settings
              </Link>
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
