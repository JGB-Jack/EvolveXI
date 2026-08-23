"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ClipboardList, FileText, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/squad", label: "Squad", icon: Users },
  { href: "/sessions", label: "Sessions", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/rankings", label: "Ranking", icon: ListOrdered },
];

const TAB_CLASSES =
  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 transition-colors";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="primary-gradient fixed inset-x-4 bottom-4 z-40 rounded-3xl shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-around p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                TAB_CLASSES,
                active
                  ? "bg-primary-foreground text-primary"
                  : "text-primary-foreground/70",
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
