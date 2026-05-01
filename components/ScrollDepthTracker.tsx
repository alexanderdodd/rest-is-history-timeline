"use client";

import { track } from "@vercel/analytics";
import { useEffect, useRef } from "react";

const THRESHOLDS = [25, 50, 75, 100] as const;

/**
 * Fires a `scroll_depth` event the first time the user crosses each of
 * 25/50/75/100% of the page height. Tells us how deep into the timeline
 * people actually go — distinguishes "bounced after seeing the spine" from
 * "scrolled the whole 3000 BC → present arc".
 *
 * One event per threshold per session (we de-dupe in a ref). Renders nothing.
 */
export default function ScrollDepthTracker() {
  const reportedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let raf = 0;

    function report() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = (window.scrollY / max) * 100;
      for (const t of THRESHOLDS) {
        if (pct >= t && !reportedRef.current.has(t)) {
          reportedRef.current.add(t);
          track("scroll_depth", { depth: t });
        }
      }
    }

    function onScroll() {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        report();
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once on mount in case the page loads pre-scrolled (deep link).
    report();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
