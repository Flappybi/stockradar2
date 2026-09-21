import { z } from "zod";

export const tickerSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}(?:\.JK)?$/)
  .transform((value) => value.replace(/\.JK$/, ""));
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");
const number = z.number().finite().nullish();
const year = z
  .union([
    z.number().int(),
    z
      .string()
      .regex(/^\d{4}$/)
      .transform(Number),
  ])
  .pipe(z.number().int().min(1900).max(2200));
export const reportSchema = z
  .object({
    symbol: z.string().pipe(tickerSchema),
    company_name: z.string().trim().min(1),
    overview: z
      .object({
        sector: z.string().nullish(),
        sub_sector: z.string().nullish(),
        industry: z.string().nullish(),
        latest_close_date: dateSchema.nullish(),
      })
      .passthrough()
      .nullish(),
    financials: z
      .object({
        historical_financial_ratio: z
          .array(
            z
              .object({
                year,
                profitability: z
                  .object({
                    roe: number,
                    roa: number,
                    net_profit_margin: number,
                  })
                  .passthrough()
                  .nullish(),
                leverage: z
                  .object({ debt_to_equity_ratio: number })
                  .passthrough()
                  .nullish(),
              })
              .passthrough(),
          )
          .nullish(),
        historical_financials: z
          .array(
            z.object({ year, revenue: number, earnings: number }).passthrough(),
          )
          .nullish(),
      })
      .passthrough()
      .nullish(),
    valuation: z
      .object({
        historical_valuation: z
          .array(z.object({ year, pe: number, pb: number }).passthrough())
          .nullish(),
      })
      .passthrough()
      .nullish(),
    dividend: z.object({ yield_ttm: number }).passthrough().nullish(),
  })
  .passthrough();
export const dailySchema = z.array(
  z
    .object({
      symbol: tickerSchema,
      date: dateSchema,
      close: z.number().finite().positive().nullable(),
      volume: z.number().finite().nonnegative().nullish(),
    })
    .passthrough(),
);
export type CompanyReport = z.input<typeof reportSchema>;
