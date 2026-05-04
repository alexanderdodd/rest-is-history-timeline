"use client";

import { useEffect, useRef, useState } from "react";
import FilterPanel, { type Filters } from "@/components/FilterPanel";
import SearchBar from "@/components/SearchBar";
import type { PositionedEpisode } from "@/lib/episodes-loader";

type Props = {
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  episodes: PositionedEpisode[];
};

function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.hostsOnly) n++;
  if (f.seriesOnly) n++;
  if (f.minEpisodeNumber > 0) n++;
  return n;
}

/**
 * Sticky trigger button at the top of the page that opens a command-palette
 * style native <dialog> containing the search input and the filter controls.
 *
 * - `/` opens the dialog (and focuses the search input).
 * - Escape / clicking the backdrop / clicking the close × all close it.
 * - When a search result is picked, SearchBar calls onSelect → the dialog
 *   closes and the page scrolls to the chosen card.
 *
 * We use the native <dialog> element rather than a custom div + portal:
 * gets us focus trap, Escape-to-close, ::backdrop styling, and the right
 * accessibility semantics (role="dialog" with aria-modal) without writing
 * any of it ourselves.
 */
export default function Toolbar({
  filters,
  onFiltersChange,
  episodes,
}: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Drive the native dialog imperatively from React state.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      // Focus the search input on the next tick so it's ready to type into.
      requestAnimationFrame(() => {
        const input = dlg.querySelector<HTMLInputElement>(".search-input");
        input?.focus();
        input?.select();
      });
    }
    if (!open && dlg.open) dlg.close();
  }, [open]);

  // Global `/` shortcut to open the dialog. Skipped when the user is
  // already typing into another input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // <dialog> doesn't auto-close when the backdrop is clicked. We get that
  // behaviour by detecting clicks where the target IS the dialog itself —
  // those are clicks on the backdrop, since the inner content stops them.
  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setOpen(false);
  }

  const count = activeFilterCount(filters);

  return (
    <>
      <div className="toolbar-strip">
        <button
          type="button"
          className={`toolbar-trigger${count > 0 ? " is-active" : ""}`}
          onClick={() => setOpen(true)}
          aria-label="Open search and filters"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="toolbar-trigger-placeholder">
            Search episodes or year — try 1789, Napoleon, 44 BC
          </span>
          {count > 0 && (
            <span className="toolbar-trigger-badge" aria-label={`${count} filters active`}>
              {count} filter{count === 1 ? "" : "s"}
            </span>
          )}
          <kbd className="toolbar-trigger-kbd" aria-hidden="true">
            /
          </kbd>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="search-dialog"
        onClick={onDialogClick}
        onClose={() => setOpen(false)}
        aria-label="Search and filter"
      >
        <div className="search-dialog-inner">
          <button
            type="button"
            className="search-dialog-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
          <SearchBar episodes={episodes} onSelect={() => setOpen(false)} />
          <FilterPanel filters={filters} onChange={onFiltersChange} />
        </div>
      </dialog>
    </>
  );
}
