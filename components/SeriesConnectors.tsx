"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Path = {
  /** Composite key: seriesId + part-pair index. */
  key: string;
  /** SVG `d` attribute. */
  d: string;
  /** Stroke colour, deterministic from the series name. */
  stroke: string;
};

/** Hash a string → 0–359 hue. Deterministic, FNV-ish. */
function hueFromSeriesId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

function strokeForSeries(id: string): string {
  return `hsl(${hueFromSeriesId(id)}deg 70% 62% / 0.55)`;
}

/**
 * SVG overlay that draws Bezier curves between consecutive parts of every
 * multi-part series in the timeline. Designed to mount inside `.ct-timeline`
 * via the Timeline `overlay` slot — the SVG fills its parent absolutely,
 * pointer-events: none, so it doesn't block clicks on cards.
 *
 * Recomputes on resize and after images load (their late layout shifts the
 * card positions). Otherwise pure DOM measurement; no React state on the
 * card components.
 */
export default function SeriesConnectors() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const container = svg.parentElement;
    if (!container) return;

    function recompute() {
      if (!svg || !container) return;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = container.scrollHeight;
      const spineX = containerWidth / 2;

      const cards = Array.from(
        container.querySelectorAll<HTMLElement>("[data-series-id]"),
      );
      // Group by series id, sorted by part number ascending.
      const groups = new Map<string, HTMLElement[]>();
      for (const el of cards) {
        const id = el.getAttribute("data-series-id");
        if (!id) continue;
        const arr = groups.get(id) ?? [];
        arr.push(el);
        groups.set(id, arr);
      }

      const next: Path[] = [];
      for (const [id, els] of groups) {
        if (els.length < 2) continue;
        els.sort((a, b) => {
          const pa = Number(a.getAttribute("data-series-part") ?? 0);
          const pb = Number(b.getAttribute("data-series-part") ?? 0);
          return pa - pb;
        });
        const stroke = strokeForSeries(id);
        for (let i = 0; i < els.length - 1; i++) {
          const r1 = els[i].getBoundingClientRect();
          const r2 = els[i + 1].getBoundingClientRect();

          // Inner edge (spine-facing side) of each card, relative to container.
          const r1CenterX = r1.left + r1.width / 2;
          const x1 =
            (r1CenterX < containerRect.left + spineX
              ? r1.right
              : r1.left) - containerRect.left;
          const y1 = r1.bottom - containerRect.top;

          const r2CenterX = r2.left + r2.width / 2;
          const x2 =
            (r2CenterX < containerRect.left + spineX
              ? r2.right
              : r2.left) - containerRect.left;
          const y2 = r2.top - containerRect.top;

          // Cubic Bezier with control points pulling toward the spine on
          // each end — produces a graceful S-curve that's distinct from
          // both card edges and the vertical spine.
          const c1x = spineX;
          const c1y = y1 + Math.min(80, (y2 - y1) * 0.4);
          const c2x = spineX;
          const c2y = y2 - Math.min(80, (y2 - y1) * 0.4);

          next.push({
            key: `${id}-${i}`,
            d: `M${x1.toFixed(1)},${y1.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
            stroke,
          });
        }
      }

      setSize({ w: containerWidth, h: containerHeight });
      setPaths(next);
    }

    recompute();

    const ro = new ResizeObserver(recompute);
    ro.observe(container);

    // Card images load late and shift layout — re-run after each loads.
    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
    const onLoad = () => recompute();
    for (const img of imgs) {
      if (!img.complete) img.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      ro.disconnect();
      for (const img of imgs) img.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="ct-series-connectors"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden="true"
    >
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
