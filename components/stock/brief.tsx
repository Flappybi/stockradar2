"use client";
import { useState } from "react";
import { Sparkles, LoaderCircle } from "lucide-react";
import type { BriefResult } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
export function ResearchBrief({
  ticker,
  initial,
}: {
  ticker: string;
  initial: BriefResult | null;
}) {
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function generate() {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!r.ok) throw new Error();
      setResult((await r.json()) as BriefResult);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="panel brief">
      <div className="panel-heading">
        <h2>StockRadar AI Research Brief</h2>
        <Sparkles size={19} className="text-primary" />
      </div>
      <div className="panel-content">
        {result ? (
          <>
            <p className="small muted mb-4">
              {result.provider === "gemini"
                ? "AI-generated explanation"
                : "Deterministic research brief"}{" "}
              ·{" "}
              {result.provider === "gemini"
                ? result.model
                : "Template fallback — Gemini unavailable"}
              {result.cached ? " · Cached" : ""}
            </p>
            <p className="brief-lead">{result.brief.summary}</p>
            <div className="brief-columns">
              <div>
                <h3>Signal interpretation</h3>
                <p>{result.brief.signalInterpretation}</p>
                <h3>Measured strengths</h3>
                <ul className="brief-list">
                  {result.brief.strengths.map((s) => (
                    <li key={s.title}>
                      <strong>{s.title}</strong>
                      <br />
                      {s.explanation}
                      <span className="evidence">
                        {s.metricReferences.join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Anomaly interpretation</h3>
                <p>{result.brief.anomalyInterpretation}</p>
                <h3>Watch items</h3>
                <ul className="brief-list">
                  {result.brief.watchItems.map((s) => (
                    <li key={s.title}>
                      <strong>{s.title}</strong>
                      <br />
                      {s.explanation}
                      <span className="evidence">
                        {s.metricReferences.join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {result.brief.anomalyDrivers.length ? (
              <>
                <h3 className="mt-4">Anomaly drivers</h3>
                <ul className="brief-list">
                  {result.brief.anomalyDrivers.map((d) => (
                    <li key={d.driver}>
                      <strong>{d.driver}: </strong>
                      {d.explanation}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="small muted mt-4">
              {result.brief.dataLimitations.join(" ")}
            </p>
            <p className="small muted mt-3">{result.brief.closingNote}</p>
          </>
        ) : (
          <>
            <p className="muted mb-4">
              Translate the calculated Signal and Anomaly findings into a
              concise research brief.
            </p>
            <Button onClick={generate} disabled={loading}>
              {loading ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              {loading ? "Analyzing StockRadar metrics…" : "Generate AI Brief"}
            </Button>
          </>
        )}
        {error ? (
          <p role="alert" className="validation">
            The brief could not be loaded. Please try again.
          </p>
        ) : null}
        <p className="small muted mt-5">
          Based only on StockRadar’s calculated metrics. Model-generated text
          may contain errors; review the underlying evidence.
        </p>
      </div>
    </section>
  );
}
