import type { MarketObservation, StockInput } from "@/lib/analytics/types";

export const FIXTURE_AS_OF = "2026-09-18";
export const FIXTURE_FETCHED_AT = "2026-09-18T10:00:00.000Z";
const companies = [
  ["BBCA", "Bank Central Asia", "Financials", "Banks"],
  ["BBRI", "Bank Rakyat Indonesia", "Financials", "Banks"],
  ["BMRI", "Bank Mandiri", "Financials", "Banks"],
  ["BBNI", "Bank Negara Indonesia", "Financials", "Banks"],
  ["BBTN", "Bank Tabungan Negara", "Financials", "Banks"],
  [
    "ICBP",
    "Indofood CBP Sukses Makmur",
    "Consumer Non-Cyclicals",
    "Food & Beverage",
  ],
  [
    "INDF",
    "Indofood Sukses Makmur",
    "Consumer Non-Cyclicals",
    "Food & Beverage",
  ],
  ["MYOR", "Mayora Indah", "Consumer Non-Cyclicals", "Food & Beverage"],
  [
    "UNVR",
    "Unilever Indonesia",
    "Consumer Non-Cyclicals",
    "Household Products",
  ],
  [
    "ROTI",
    "Nippon Indosari Corpindo",
    "Consumer Non-Cyclicals",
    "Food & Beverage",
  ],
  ["ADRO", "Alamtri Resources Indonesia", "Energy", "Coal"],
  ["PTBA", "Bukit Asam", "Energy", "Coal"],
  ["ITMG", "Indo Tambangraya Megah", "Energy", "Coal"],
  ["MEDC", "Medco Energi Internasional", "Energy", "Oil & Gas"],
  ["PGAS", "Perusahaan Gas Negara", "Energy", "Oil & Gas"],
] as const;
// All prices, volumes, financials and peer group assignments below are synthetic.
// Weekdays deliberately do not attempt to reproduce the IDX holiday calendar.
export function fixtureInputs(): StockInput[] {
  const days: string[] = [];
  for (let offset = 399; offset >= 0; offset--) {
    const day = new Date(Date.parse(FIXTURE_AS_OF) - offset * 86_400_000);
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6)
      days.push(day.toISOString().slice(0, 10));
  }
  return companies.map(([ticker, name, sector, subsector], index) => {
    let close = 1_500 + index * 650;
    let state = 12345 + index * 591;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const history: MarketObservation[] = days.map((date, dayIndex) => {
      const volatility = 0.007 + (index % 5) * 0.003;
      let change =
        0.0002 +
        (((index * 7) % 11) - 4) * 0.00013 +
        (random() - 0.5) * volatility * 2;
      if (index === 10 && dayIndex > days.length - 11) change *= 3.8;
      if (dayIndex === days.length - 1 && index === 1) change = 0.046;
      if (dayIndex === days.length - 1 && index === 11) change = -0.055;
      close *= 1 + change;
      let volume = Math.round(
        (1_100_000 + index * 170_000) * (0.7 + random() * 0.6),
      );
      if (dayIndex === days.length - 1 && index === 0) volume *= 6;
      if (dayIndex === days.length - 1 && index === 8) volume *= 4;
      return { date, close, volume };
    });
    const rank = (index * 7) % 15;
    return {
      ticker,
      name,
      sector,
      subsector,
      industry: subsector,
      source: "fixture",
      fetchedAt: FIXTURE_FETCHED_AT,
      financialYear: 2025,
      valuationYear: 2025,
      history,
      fundamentals: {
        roe: 0.065 + rank * 0.011,
        roa: 0.012 + ((index * 4) % 15) * 0.006,
        netMargin: 0.04 + ((index * 3) % 14) * 0.013,
        debtToEquity: 0.22 + ((index * 5) % 13) * 0.14,
        revenueGrowth: -0.03 + ((index * 11) % 16) * 0.018,
        earningsGrowth: -0.11 + ((index * 9) % 17) * 0.027,
        pe: 5.8 + ((index * 13) % 17) * 1.3,
        pb: 0.7 + ((index * 2) % 15) * 0.3,
        dividendYield: 0.008 + ((index * 4) % 13) * 0.004,
      },
    };
  });
}
