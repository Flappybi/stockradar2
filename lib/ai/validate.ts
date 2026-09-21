import { stockResearchBriefSchema } from "./schemas";
import type { StockExplanationContext } from "./context";

export class InvalidBriefError extends Error {
  constructor() {
    super("The provider response failed grounding validation.");
    this.name = "InvalidBriefError";
  }
}

const forbiddenClaims = [
  /\b(?:strong buy|strong sell|buy now|sell now|you should (?:buy|sell|hold)|(?:buy|sell|hold) (?:rating|recommendation)|(?:rating|recommendation)\s*:\s*(?:buy|sell|hold))\b/i,
  /\b(?:guaranteed (?:returns?|profit|gains?)|risk[ -]free|will definitely|certain to (?:rise|fall)|(?:stock|price|shares?) will (?:rise|fall|increase|decrease))\b/i,
  /\b(?:caused|causing|driven by|because (?:of|the)|owing to|due to (?:earnings|news|an? announcement|an? acquisition))\b/i,
  /\b(?:(?:announced|announces|completed)\s+(?:an?\s+|the\s+)?(?:acquisition|merger|deal|buyback|dividend|partnership)|acquired\s+(?:an?\s+|the\s+)?(?:company|business|competitor)|earnings (?:beat|miss)|analyst (?:upgrade|downgrade)|insider (?:buying|selling))\b/i,
];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const numberWords =
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion";
const spelledQuantity = new RegExp(
  `\\b(?:(?:score|return|growth|margin|yield|volume|ratio)\\s*(?:is|of|was|:|equals)?\\s*(?:minus\\s+|negative\\s+)?(?:${numberWords})\\b|(?:${numberWords})\\s+(?:percent|percentage points|times|million|billion)\\b)`,
  "i",
);

/** Numeric prose must use a complete canonical label/value pair, not merely an allowed number. */
export function validateBrief(
  value: unknown,
  context: StockExplanationContext,
) {
  const parsed = stockResearchBriefSchema.safeParse(value);
  if (!parsed.success) throw new InvalidBriefError();
  const brief = parsed.data;
  const references = [...brief.strengths, ...brief.watchItems].flatMap(
    (item) => item.metricReferences,
  );
  if (references.some((reference) => !context.facts.includes(reference)))
    throw new InvalidBriefError();
  const strings = [
    brief.summary,
    brief.signalInterpretation,
    brief.anomalyInterpretation,
    ...brief.strengths.flatMap((item) => [item.title, item.explanation]),
    ...brief.watchItems.flatMap((item) => [item.title, item.explanation]),
    ...brief.anomalyDrivers.flatMap((item) => [item.driver, item.explanation]),
    ...brief.dataLimitations,
    brief.closingNote,
  ];
  for (const text of strings) {
    if (
      forbiddenClaims.some((pattern) => pattern.test(text)) ||
      spelledQuantity.test(text)
    )
      throw new InvalidBriefError();
    let remaining = text;
    for (const fact of [...context.facts].sort((a, b) => b.length - a.length)) {
      remaining = remaining.replace(
        new RegExp(
          `${escapeRegExp(fact)}(?!\\d|[.,]\\d|%|\\s+(?:percent|hundred|thousand|million|billion)\\b)`,
          "g",
        ),
        "",
      );
    }
    const knownLabels = Object.values(context.signal.factors).flatMap(
      (factor) => factor.metrics.map((metric) => metric.label),
    );
    for (const identity of [
      context.company.ticker,
      context.company.name,
      ...knownLabels,
    ]) {
      if (identity)
        remaining = remaining.replace(
          new RegExp(`(?<![\\w])${escapeRegExp(identity)}(?![\\w])`, "g"),
          "",
        );
    }
    // Deny all unanchored quantities, including a real value attached to the wrong metric.
    if (/\d/.test(remaining)) throw new InvalidBriefError();
  }
  return brief;
}
