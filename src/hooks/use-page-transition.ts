"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type RefObject } from "react";

// Restarts a CSS entrance animation on every navigation without
// remounting the element - used on the top bar, page content, and
// bottom nav so all three slide in together, in sync, on each route
// change. Each element keeps its own DOM node (not nested inside a
// shared animated wrapper), since a transform on an ancestor breaks
// position: fixed/sticky descendants like the bottom nav and top bar.
export function usePageTransition<T extends HTMLElement>(): RefObject<T | null> {
  const pathname = usePathname();
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetWidth; // force reflow so the animation removal registers
    el.style.animation = "";
  }, [pathname]);

  return ref;
}
