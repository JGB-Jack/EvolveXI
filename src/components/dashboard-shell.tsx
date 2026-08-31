"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { usePageTransition } from "@/hooks/use-page-transition";
import { cn } from "@/lib/utils";

// The assessment and report screens have their own fixed action bar at the
// bottom (Back/Save/Next), so the global bottom nav is hidden there to avoid
// two bars stacking during that focused workflow.
const HIDES_BOTTOM_NAV = [/^\/sessions\/[^/]+\/assess\//, /^\/sessions\/[^/]+\/report\//];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideBottomNav = HIDES_BOTTOM_NAV.some((pattern) => pattern.test(pathname));
  const contentRef = usePageTransition<HTMLDivElement>();

  return (
    <>
      <main
        className={cn(
          "mx-auto max-w-6xl overflow-x-hidden px-4 py-8",
          !hideBottomNav && "pb-24",
        )}
      >
        <div ref={contentRef} className="fade-in-strong">
          {children}
        </div>
      </main>
      {!hideBottomNav && <BottomNav />}
    </>
  );
}
