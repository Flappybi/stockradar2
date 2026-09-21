"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SplashGate } from "@/components/splash-screen";
import {
  Radar,
  House,
  SlidersHorizontal,
  FileText,
  Layers,
  Search,
  Database,
} from "lucide-react";
const NAV = [
  { href: "/", label: "Overview", icon: House },
  { href: "/screener", label: "Screener", icon: SlidersHorizontal },
  { href: "/radar", label: "Market Radar", icon: Radar },
  { href: "/methodology", label: "Methodology", icon: FileText },
];
type SearchStock = { ticker: string; name: string; sector: string | null };
export function Shell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: string;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [stocks, setStocks] = useState<SearchStock[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!open || loaded) return;
    const ctrl = new AbortController();
    fetch("/api/stocks", { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = await r.json();
        setStocks(data.stocks);
        setLoaded(true);
        setFailed(false);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setFailed(true);
      });
    return () => ctrl.abort();
  }, [open, loaded]);
  const matches = stocks
    .filter((s) =>
      `${s.ticker} ${s.name}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 7);
  if (pathname === "/splash") return children;
  return (
    <SplashGate mode={mode}>
      <div className="shell">
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <aside className="sidebar">
          <Link href="/" className="brand" aria-label="StockRadar overview">
            <Radar />
            <span>StockRadar</span>
          </Link>
          <nav className="nav" aria-label="Primary navigation">
            {NAV.map((n) => (
              <Link
                href={n.href}
                key={n.href}
                className={pathname === n.href ? "active" : ""}
                aria-current={pathname === n.href ? "page" : undefined}
              >
                <n.icon />
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>
          <a
            className="attribution"
            href="https://sectors.app"
            target="_blank"
            rel="noreferrer"
          >
            <Layers size={18} />
            <span>Powered by Sectors</span>
          </a>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div
              className="search-wrap"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
              }}
            >
              <Search />
              <input
                aria-label="Search companies"
                placeholder="Search company or ticker (e.g. BBCA)"
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
                aria-controls="search-results"
              />
              {open && query.length > 0 ? (
                <div id="search-results" className="search-results">
                  {matches.map((s) => (
                    <Link
                      key={s.ticker}
                      href={`/stock/${s.ticker}`}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <strong>{s.ticker}</strong>
                      <span className="small muted">{s.name}</span>
                    </Link>
                  ))}
                  {!matches.length ? (
                    <p className="small muted p-3">
                      {failed
                        ? "Company search is temporarily unavailable."
                        : loaded
                          ? "No matching companies."
                          : "Loading companies…"}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <span className="data-status">
              <Database />
              {mode === "fixture" ? "Demo data" : "Sectors data"}
            </span>
          </header>
          <main id="main" className="main" tabIndex={-1}>
            {children}
            <footer className="footer">
              <span>StockRadar · Find the signal behind the market.</span>
              <span>Research support, not investment advice.</span>
            </footer>
          </main>
        </div>
      </div>
    </SplashGate>
  );
}
