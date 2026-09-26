// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseWatchlist, toggleWatchlist } from "@/lib/watchlist";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("device watchlist", () => {
  it("rejects corrupt values and keeps only distinct ticker symbols", () => {
    expect(parseWatchlist("invalid")).toEqual([]);
    expect(parseWatchlist('{"ticker":"BBCA"}')).toEqual([]);
    expect(parseWatchlist('["BBCA",null,"BBCA","<script>","BBRI",7]')).toEqual([
      "BBCA",
      "BBRI",
    ]);
  });
  it("reads the latest saved list before each change so another tab's entries survive", () => {
    toggleWatchlist("BBCA");
    localStorage.setItem("stockradar-watchlist-v1", '["BBCA","BBRI"]');
    expect(toggleWatchlist("BMRI")).toBe(true);
    expect(
      parseWatchlist(localStorage.getItem("stockradar-watchlist-v1")),
    ).toEqual(["BBCA", "BBRI", "BMRI"]);
    toggleWatchlist("BBCA");
    expect(
      parseWatchlist(localStorage.getItem("stockradar-watchlist-v1")),
    ).toEqual(["BBRI", "BMRI"]);
  });
  it("reports storage failure without emitting a false success", () => {
    const event = vi.fn();
    window.addEventListener("stockradar-watchlist-changed", event);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    expect(toggleWatchlist("BBCA")).toBe(false);
    expect(event).not.toHaveBeenCalled();
    window.removeEventListener("stockradar-watchlist-changed", event);
  });
  it("does not store invalid identifiers", () => {
    expect(toggleWatchlist("../bad")).toBe(false);
    expect(localStorage.length).toBe(0);
  });
});
