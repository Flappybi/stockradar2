import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { stockResearchBriefSchema } from "./schemas";
import type { StockExplanationContext } from "./context";
import { STOCK_EXPLANATION_SYSTEM_PROMPT } from "./prompt";
import { InvalidBriefError } from "./validate";

export interface ExplanationProvider {
  explainStock(
    context: StockExplanationContext,
    options: { signal: AbortSignal; retry: boolean },
  ): Promise<unknown>;
}

export class GeminiExplanationProvider implements ExplanationProvider {
  private readonly client: GoogleGenAI;
  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { retryOptions: { attempts: 1 } },
    });
  }
  async explainStock(
    context: StockExplanationContext,
    options: { signal: AbortSignal; retry: boolean },
  ) {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: JSON.stringify(context),
      config: {
        systemInstruction:
          STOCK_EXPLANATION_SYSTEM_PROMPT +
          (options.retry
            ? "\nThe previous response failed validation. Copy complete canonical facts exactly, remove unsupported claims, and satisfy every schema field."
            : ""),
        abortSignal: options.signal,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(stockResearchBriefSchema),
        temperature: 0.2,
        maxOutputTokens: 2200,
      },
    });
    try {
      return JSON.parse(response.text ?? "");
    } catch {
      throw new InvalidBriefError();
    }
  }
}
