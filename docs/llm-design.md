# StockRadar explanation engine

Gemini translates existing StockRadar measurements into a research brief. It never computes or replaces Signal, factor, or Anomaly scores. The complete analytical product and a useful research brief remain available without a Gemini key.

## Provider and model configuration

`lib/ai/gemini.ts` uses the official `@google/genai` SDK on the server. Both the provider and orchestration modules import `server-only`. Browser components import only the `BriefResult` or `StockResearchBrief` types from `lib/ai/schemas.ts`; the browser never receives credentials or calls Gemini directly.

Configure `GEMINI_API_KEY` and `GEMINI_MODEL` in the server environment. There is deliberately no built-in model ID. A configured key without a model returns the deterministic brief with `model_not_configured`. Missing credentials return `not_configured`. Restart the application after changing its environment.

As checked against official documentation on September 20, 2026, `gemini-3.5-flash-lite` is a stable model supporting structured outputs, and standard input/output are listed as free of charge on the Free Tier. Availability and quota depend on the account and can change; this implementation does not promise a fixed free request allowance. These documentation checks do not constitute a successful authenticated live inference test.

- [Gemini 3.5 Flash-Lite model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output)

## Input and output contracts

The server accepts a verified `StockAnalysis`. `buildExplanationContext` selects company identity, data source and dates, the deterministic Signal factors and underlying peer evidence, Anomaly components and baseline statistics, analytics version, and deterministic findings. Raw market-history arrays, user prompts, URLs, credentials, and outside news are not sent.

Null measurements remain null. The context retains canonical analytics units: coverage fractions, composite factor weights as percentages, submetric/component weights as fractions, and anomaly `percentDifference` already in percent units. Values in `facts` are formatted to at most two decimal places for display; this does not alter the analytical scores. References such as `Quality score: 90` are created deterministically before generation. The model may copy these complete label/value pairs but may not invent formatting, calculate new values, or attach an existing value to a different label.

The strict Zod output schema requires:

| Field | Meaning |
| --- | --- |
| `summary` | Concise synthesis of the supplied measurements |
| `signalInterpretation` | Peer-relative factor profile, separate from unusualness |
| `anomalyInterpretation` | Statistical unusualness, without a causal or directional forecast |
| `strengths`, `watchItems` | Up to four title/explanation items with exact metric references |
| `anomalyDrivers` | Up to four measured anomaly explanations |
| `dataLimitations` | Up to four explicit coverage, source, or missing-data limitations |
| `closingNote` | Neutral research context |

`BriefResult` wraps this brief with `provider` (`gemini` or `deterministic`), `model` (null for deterministic), `generatedAt`, `cached`, and an optional safe reason code. Errors never expose the upstream error message or API key.

## Grounding and validation

The system prompt prohibits outside knowledge, invented corporate events, unsupported causality, recalculated scores, forecasts, guarantees, investment ratings, and personalized advice. It instructs Gemini to acknowledge weaknesses and missing data, distinguish illustrative fixtures, and identify the supplied peer comparison when discussing relative results. Context strings are treated as data, not instructions.

The request uses `responseMimeType: application/json` and the JSON Schema generated directly from the same Zod schema through `z.toJSONSchema`. No search, URL context, function calls, or other tools are configured. The response is JSON-parsed, Zod-validated, and then semantically checked before it can reach the UI.

Numeric prose must copy a complete canonical reference. The validator removes only exact known metric/value pairs and known company/metric labels, then rejects remaining digits. Consequently, both an invented `Signal Score: 99` and a swapped `Signal Score: 65` fail when the true signal is 70, even if 65 is the valid Anomaly score. Decimal extensions, percent suffixes, and fabricated reference strings also fail. Known metric horizons such as `30D price return` remain usable as labels. All structured metric references must exist in the current context.

Focused phrase checks reject explicit trading recommendations, return guarantees, causal narratives, and asserted unsupported corporate events. Neutral statements that causal or event evidence is unavailable remain allowed. These are defense-in-depth checks, not a proof that every qualitative statement is true: free-form language can imply unsupported conclusions without matching a pattern. The UI should retain its model-error notice and links to underlying metrics. The deterministic fallback is the stricter alternative when validation fails.

## Failures, retries, and request budget

Only malformed JSON, schema failure, or grounding failure receives one retry, with stricter instructions. There are at most two inference attempts per generation. SDK HTTP retries are explicitly disabled (`attempts: 1`), including for quota errors. HTTP 429 immediately returns `quota_exceeded`; other transport failures return `provider_unavailable`. Provider content is never shown following a failed validation.

Each attempt has a twelve-second timeout. It passes an `AbortController` signal into the SDK and aborts the underlying client request, with a race to bound the response time even if a provider stalls. Google documents that client cancellation does not necessarily stop remote processing or associated usage. Timed-out attempts are not retried.

The production singleton allows ten provider attempts per minute per process, including semantic retries, and at most thirty-two distinct in-flight explanation requests. Excess demand returns a useful deterministic brief with `rate_limited`. Requests for an identical cache key share the same pending promise, including the initial asynchronous cache lookup. This is a basic per-process quota control; a multi-instance production deployment should add a shared rate limit at the API gateway or database.

## Caching and rendering

The cache key is a SHA-256 digest of the entire curated context plus configured model, key-availability state, and `STOCK_EXPLANATION_PROMPT_VERSION`. The context includes ticker, analytics version, source, dates, factor weights, peer evidence, underlying measurements, and findings. Any change invalidates the brief. Volatile calculation timestamps that do not affect explanatory context do not cause regeneration.

Validated Gemini results live for twenty-four hours; deterministic fallbacks live for one minute so temporary provider failures can recover. Storage uses the common cache adapter, which combines bounded process memory and optional database persistence. Reads validate the result shape and revalidate Gemini grounding and model identity. Cache outages do not remove research support.

`getCachedBrief(analysis)` reads a valid cached result or returns null without inference. Stock-page rendering can use this function to show existing research while leaving generation behind an explicit button. `explainStock(analysis)` is the server generation entry point. The POST endpoint must accept only a ticker, retrieve that ticker's verified server analysis, and pass it to this function; it must never accept a browser-authored context or model/prompt override.

## Deterministic brief

The fallback names both available headline scores, highest and lowest measured factors with traceable references, anomaly Z-scores and percent deviations, missing factors, source limitations, and applicable analytics failure reasons. It makes no investment recommendation and does not infer why prices moved. The provider is explicitly marked `deterministic`, never represented as AI-generated text.

## Verification

`tests/ai.test.ts` exercises context curation, null preservation, numerical contradictions, unsupported causes and recommendations, valid references, neutral limitations, all fixture-company fallbacks, stale-history fallback, missing configuration, successful generation, one semantic retry, quota handling, client abort, cache reuse/expiry/invalidation, read-only cache lookup, in-flight coalescing, and provider budgets. `tests/ai-gemini.test.ts` verifies the actual SDK request contract using a mock at the remote generation boundary: configured model, strict JSON schema, disabled retries, no tools, and the cancellation signal.

Unit tests intentionally do not spend live Gemini quota. An authenticated live check requires a valid configured key and model; report it separately from mocked integration coverage.
