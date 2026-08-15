"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

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
        <div />
      </div>
    </header>
  );
}
