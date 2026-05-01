"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ERA_BY_ID } from "@/lib/data/eras";
import { formatEventDate } from "@/lib/dates";
import { searchEvents, type SearchResult } from "@/lib/search";
import type { HistoricalEvent } from "@/lib/data/types";

type Props = {
  events: HistoricalEvent[];
};

function reasonLabel(reason: SearchResult["reason"]): string {
  switch (reason) {
    case "exact-year":
      return "Exact year";
    case "near-year":
      return "Closest year";
    case "title":
      return "Title match";
    case "description":
      return "Description match";
  }
}

function scrollToEvent(eventId: string): boolean {
  const el = document.querySelector(`[data-event-id="${eventId}"]`);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("event-flash");
  window.setTimeout(() => el.classList.remove("event-flash"), 1600);
  return true;
}

export default function SearchBar({ events }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const results = useMemo(() => searchEvents(query, events), [query, events]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Focus the input on `/` keypress, like a typical site search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const select = useCallback((r: SearchResult) => {
    if (scrollToEvent(r.event.id)) {
      setOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
        return;
      }
      if (!open || results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = results[activeIndex];
        if (r) select(r);
      }
    },
    [open, results, activeIndex, select],
  );

  return (
    <div className="search-bar" ref={containerRef}>
      <div className="search-inner">
        <span className="search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="search-input"
          placeholder="Search events or year — try 1789, Napoleon, 44 BC"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
        <kbd className="search-shortcut" aria-hidden="true">/</kbd>
      </div>

      {open && query && (
        <ul
          id={listboxId}
          role="listbox"
          className="search-results"
          onPointerDown={(e) => e.preventDefault()}
        >
          {results.length === 0 && (
            <li className="search-empty">No matches.</li>
          )}
          {results.map((r, i) => {
            const era = ERA_BY_ID[r.event.era];
            return (
              <li
                key={r.event.id}
                role="option"
                aria-selected={i === activeIndex}
                className={`search-result ${i === activeIndex ? "is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(r)}
              >
                <div className="search-result-row">
                  <span className="search-result-title">{r.event.title}</span>
                  <span className="search-result-date">
                    {formatEventDate(r.event.year, r.event.month, r.event.day)}
                  </span>
                </div>
                <div className="search-result-meta">
                  <span className="search-result-era">{era?.name ?? r.event.era}</span>
                  <span className="search-result-reason">{reasonLabel(r.reason)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
