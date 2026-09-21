"use client";

import { ArrowRight, Radar } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import styles from "./splash-screen.module.css";

const SESSION_KEY = "stockradar-welcomed-v1";
const SESSION_EVENT = "stockradar-welcomed";
let enteredWithoutStorage = false;

function hasEntered() {
  try {
    return enteredWithoutStorage || sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return enteredWithoutStorage;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(SESSION_EVENT, callback);
  return () => window.removeEventListener(SESSION_EVENT, callback);
}

function rememberEntry() {
  enteredWithoutStorage = true;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Entry still works when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function SplashScreen({
  mode,
  onEnter,
}: {
  mode: string;
  onEnter?: () => void;
}) {
  const router = useRouter();
  function enter() {
    rememberEntry();
    if (onEnter) onEnter();
    else router.replace("/");
  }

  return (
    <div className={styles.screen}>
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.rings}>
          <div className={styles.sweep} data-testid="splash-sweep" />
          <i className={styles.pointOne} />
          <i className={styles.pointTwo} />
          <i className={styles.pointThree} />
          <i className={styles.pointFour} />
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Radar aria-hidden="true" />
          <span>StockRadar</span>
        </div>
        {mode === "fixture" ? (
          <span className={styles.source}>Demo · Synthetic data</span>
        ) : null}
      </header>
      <main className={styles.main} aria-labelledby="splash-heading">
        <div className={styles.composition}>
          <Radar
            className={styles.emblem}
            strokeWidth={1.2}
            aria-hidden="true"
          />
          <div className={styles.wordmark}>StockRadar</div>
          <h1 id="splash-heading" className={styles.heading}>
            Find the signal
            <br />
            <em>behind the market.</em>
          </h1>
          <p className={styles.description}>
            Transparent signals. Unusual activity. Grounded research.
          </p>
          <button type="button" onClick={enter} className={styles.enter}>
            Enter StockRadar{" "}
            <ArrowRight size={22} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </main>
      <footer className={styles.footer}>
        <a href="https://sectors.app" target="_blank" rel="noreferrer">
          Powered by Sectors
        </a>
        <span>Research support, not investment advice.</span>
      </footer>
    </div>
  );
}

/** Welcome only at the home entry point; bookmarked research links stay direct. */
export function SplashGate({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: string;
}) {
  const pathname = usePathname();
  const remembered = useSyncExternalStore(subscribe, hasEntered, () => false);
  const [entered, setEntered] = useState(false);
  if (pathname === "/" && !remembered && !entered) {
    return (
      <SplashScreen
        mode={mode}
        onEnter={() => {
          setEntered(true);
          requestAnimationFrame(() => document.getElementById("main")?.focus());
        }}
      />
    );
  }
  return children;
}
