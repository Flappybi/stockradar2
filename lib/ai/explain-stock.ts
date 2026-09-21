import "server-only";
import { createHash } from "node:crypto";
import type { StockAnalysis } from "@/lib/analytics/types";
import { getCache, setCache } from "@/lib/cache/store";
import { buildExplanationContext } from "./context";
import { deterministicBrief } from "./fallback";
import { GeminiExplanationProvider, type ExplanationProvider } from "./gemini";
import { STOCK_EXPLANATION_PROMPT_VERSION } from "./prompt";
import { InvalidBriefError, validateBrief } from "./validate";
import { briefResultSchema, type BriefResult } from "./schemas";

type Cache = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
};
type Options = {
  cache: Cache;
  apiKey: string;
  model: string;
  provider?: ExplanationProvider;
  timeoutMs?: number;
  callsPerMinute?: number;
};
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_TTL_MS = 60 * 1000;
const MAX_IN_FLIGHT = 32;

function cacheKey(
  context: ReturnType<typeof buildExplanationContext>,
  model: string,
  configured: boolean,
) {
  return `explanation:${createHash("sha256")
    .update(
      JSON.stringify({
        context,
        model,
        configured,
        promptVersion: STOCK_EXPLANATION_PROMPT_VERSION,
      }),
    )
    .digest("hex")}`;
}

/** A singleton service owns one process-wide provider budget; retries consume that same budget. */
export function createExplanationService(options: Options) {
  const inFlight = new Map<string, Promise<BriefResult>>();
  let windowStart = 0;
  let callCount = 0;
  const consumeBudget = () => {
    if (Date.now() - windowStart >= 60_000) {
      windowStart = Date.now();
      callCount = 0;
    }
    if (callCount >= (options.callsPerMinute ?? 10)) return false;
    callCount++;
    return true;
  };
  const provider =
    options.apiKey && options.model
      ? (options.provider ??
        new GeminiExplanationProvider(options.apiKey, options.model))
      : null;

  async function readCached(
    analysis: StockAnalysis,
  ): Promise<BriefResult | null> {
    const context = buildExplanationContext(analysis);
    const key = cacheKey(context, options.model, Boolean(options.apiKey));
    try {
      const parsed = briefResultSchema.safeParse(
        await options.cache.get<unknown>(key),
      );
      if (!parsed.success) return null;
      const cached = parsed.data;
      if (cached.provider === "gemini") {
        if (cached.model !== options.model) return null;
        validateBrief(cached.brief, context);
      } else if (cached.model !== null) return null;
      return { ...cached, cached: true };
    } catch {
      return null;
    }
  }

  async function explain(analysis: StockAnalysis): Promise<BriefResult> {
    const context = buildExplanationContext(analysis);
    const key = cacheKey(context, options.model, Boolean(options.apiKey));
    const fallback = (reason: string): BriefResult => ({
      brief: deterministicBrief(context),
      provider: "deterministic",
      model: null,
      generatedAt: new Date().toISOString(),
      cached: false,
      reason,
    });
    // Register synchronously, before the asynchronous cache lookup, to coalesce misses too.
    const pending = inFlight.get(key);
    if (pending) return pending;
    if (inFlight.size >= MAX_IN_FLIGHT) return fallback("rate_limited");
    const task = (async () => {
      const cached = await readCached(analysis);
      if (cached) return cached;
      let result: BriefResult = fallback(
        !options.apiKey ? "not_configured" : "model_not_configured",
      );
      if (provider) {
        for (let attempt = 0; attempt < 2; attempt++) {
          if (!consumeBudget()) {
            result = fallback("rate_limited");
            break;
          }
          const controller = new AbortController();
          const timeout = setTimeout(
            () => controller.abort(),
            options.timeoutMs ?? 12_000,
          );
          try {
            // SDK receives the same signal, so timeout cancels the network request locally.
            const response = await Promise.race([
              provider.explainStock(context, {
                signal: controller.signal,
                retry: attempt > 0,
              }),
              new Promise<never>((_resolve, reject) =>
                controller.signal.addEventListener(
                  "abort",
                  () => reject(new Error("timeout")),
                  { once: true },
                ),
              ),
            ]);
            const brief = validateBrief(response, context);
            result = {
              brief,
              provider: "gemini",
              model: options.model,
              generatedAt: new Date().toISOString(),
              cached: false,
            };
            break;
          } catch (error) {
            if (controller.signal.aborted) {
              result = fallback("timeout");
              break;
            }
            if (error instanceof InvalidBriefError) {
              result = fallback("invalid_output");
              if (attempt === 0) continue;
              break;
            }
            const status =
              typeof error === "object" && error !== null && "status" in error
                ? error.status
                : null;
            result = fallback(
              status === 429 ? "quota_exceeded" : "provider_unavailable",
            );
            break;
          } finally {
            clearTimeout(timeout);
          }
        }
      }
      try {
        await options.cache.set(
          key,
          result,
          result.provider === "gemini" ? SUCCESS_TTL_MS : FALLBACK_TTL_MS,
        );
      } catch {
        /* Serving a valid brief takes precedence over cache persistence. */
      }
      return result;
    })();
    inFlight.set(key, task);
    try {
      return await task;
    } finally {
      inFlight.delete(key);
    }
  }
  return Object.assign(explain, { getCachedBrief: readCached });
}

let service: ReturnType<typeof createExplanationService> | undefined;
function getService() {
  if (!service) {
    service = createExplanationService({
      cache: { get: getCache, set: setCache },
      apiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
      model: process.env.GEMINI_MODEL?.trim() ?? "",
    });
  }
  return service;
}

export async function explainStock(
  analysis: StockAnalysis,
): Promise<BriefResult> {
  return getService()(analysis);
}

/** Server page read: never spends provider quota on a render. */
export async function getCachedBrief(
  analysis: StockAnalysis,
): Promise<BriefResult | null> {
  return getService().getCachedBrief(analysis);
}
