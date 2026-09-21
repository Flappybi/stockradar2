import { z } from "zod";

const evidenceItem = z
  .object({
    title: z.string().min(1).max(100),
    explanation: z.string().min(1).max(250),
    metricReferences: z.array(z.string().min(1).max(160)).min(1).max(4),
  })
  .strict();

export const stockResearchBriefSchema = z
  .object({
    summary: z.string().min(1).max(700),
    signalInterpretation: z.string().min(1).max(500),
    anomalyInterpretation: z.string().min(1).max(500),
    strengths: z.array(evidenceItem).max(4),
    watchItems: z.array(evidenceItem).max(4),
    anomalyDrivers: z
      .array(
        z
          .object({
            driver: z.string().min(1).max(100),
            explanation: z.string().min(1).max(250),
          })
          .strict(),
      )
      .max(4),
    dataLimitations: z.array(z.string().min(1).max(250)).max(4),
    closingNote: z.string().min(1).max(300),
  })
  .strict();

export type StockResearchBrief = z.infer<typeof stockResearchBriefSchema>;
export const briefResultSchema = z
  .object({
    brief: stockResearchBriefSchema,
    provider: z.enum(["gemini", "deterministic"]),
    model: z.string().nullable(),
    generatedAt: z.iso.datetime(),
    cached: z.boolean(),
    reason: z.string().max(100).optional(),
  })
  .strict();
export type BriefResult = z.infer<typeof briefResultSchema>;
