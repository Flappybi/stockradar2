"use client";

import { useSyncExternalStore } from "react";

const KEY = "stockradar-watchlist-v1";
const EVENT = "stockradar-watchlist-changed";

export function parseWatchlist(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value.filter(
          (item): item is string =>
            typeof item === "string" && /^[A-Z]{4}$/.test(item),
        ),
      ),
    ].slice(0, 200);
  } catch {
    return [];
  }
}

function read() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, callback);
  };
}

export function useWatchlist() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return parseWatchlist(raw);
}

export function toggleWatchlist(ticker: string): boolean {
  if (!/^[A-Z]{4}$/.test(ticker)) return false;
  try {
    const current = parseWatchlist(localStorage.getItem(KEY));
    const next = current.includes(ticker)
      ? current.filter((item) => item !== ticker)
      : [...current, ticker];
    if (next.length > 200) return false;
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}
