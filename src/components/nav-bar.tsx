"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function NavBar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const showHome = pathname !== "/home";
  const initials = getInitials(userName);

  return (
    <header className="primary-gradient sticky top-0 z-40">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
        <div>
          {showHome && (
            <Link
              href="/home"
              className="inline-flex items-center text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground"
            >
              Home
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
              {initials ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground text-xs font-bold text-primary">
                  {initials}
                </span>
              ) : (
                <CircleUserRound className="size-5" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href="/settings" />}>
                Settings
              </DropdownMenuItem>
              <form action={signOut}>
                <DropdownMenuItem
                  nativeButton
                  render={<button type="submit" />}
                >
                  Sign out
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
