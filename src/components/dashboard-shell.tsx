"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { cn } from "@/lib/utils";

// The assessment and report screens have their own fixed action bar at the
// bottom (Back/Save/Next), so the global bottom nav is hidden there to avoid
// two bars stacking during that focused workflow.
const HIDES_BOTTOM_NAV = [/^\/sessions\/[^/]+\/assess\//, /^\/sessions\/[^/]+\/report\//];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideBottomNav = HIDES_BOTTOM_NAV.some((pattern) => pattern.test(pathname));
  const contentRef = useRef<HTMLDivElement>(null);

  // Restart the entrance animation on every navigation without unmounting
  // the page subtree - keying this element by pathname used to force a
  // full remount, which wiped out any state living inside it (like the
  // multi-step session wizard's context) that's meant to persist across
  // routes within the same layout.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetWidth; // force reflow so the animation removal registers
    el.style.animation = "";
  }, [pathname]);

  return (
    <>
      <main
        className={cn(
          "mx-auto max-w-6xl px-4 py-8",
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
