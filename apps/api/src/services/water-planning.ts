import {
  climateSchema,
  planningCatalogSchema,
  waterPlanSchema,
  waterExplanationSchema,
  type WaterPlanningInput,
  type WaterExplainInput,
  type DemoLocale,
} from "@kavach/contracts";
import { calculateWaterPlan } from "@kavach/domain";
import latur from "../evidence/latur-rainfall.json" with { type: "json" };
import beed from "../evidence/beed-rainfall.json" with { type: "json" };
import nanded from "../evidence/nanded-rainfall.json" with { type: "json" };
import type { ExplanationProvider } from "../ports/explanation.js";
import type { SpeechProvider } from "../ports/speech.js";
import type { DemoService } from "./demo.js";
const regions = [
  { id: "latur", name: "Latur", climate: climateSchema.parse(latur) },
  { id: "beed", name: "Beed", climate: climateSchema.parse(beed) },
  { id: "nanded", name: "Nanded", climate: climateSchema.parse(nanded) },
] as const;
const silence = {
  status: "unavailable" as const,
  reason: "Voice playback was not requested.",
  retryable: false,
};
export class WaterPlanningService {
  constructor(
    private demo: DemoService,
    private provider: ExplanationProvider,
    private speech: SpeechProvider,
    private enabled: boolean,
  ) {}
  catalog() {
    return planningCatalogSchema.parse({
      demo: true,
      persisted: false,
      regions,
      crops: [
        { id: "chickpea", name: "Chickpea / gram" },
        { id: "sorghum", name: "Sorghum / jowar" },
        { id: "wheat", name: "Wheat" },
      ],
    });
  }
  assess(input: WaterPlanningInput) {
    const region = regions.find((r) => r.id === input.regionId)!;
    return waterPlanSchema.parse({
      demo: true,
      persisted: false,
      calculation: calculateWaterPlan(input),
      regionName: region.name,
      climate: region.climate,
      method: {
        title: "FAO: irrigation volume conversion and efficiency",
        url: "https://www.fao.org/4/w7320b/w7320b10.htm",
        limitation:
          "Supports volume conversion only. Application depth and efficiency are illustrative inputs, not reviewed crop recommendations.",
      },
    });
  }
  async explain(input: WaterExplainInput, requestSignal: AbortSignal) {
    const { locale, voice, question, text, history, ...numbers } = input;
    const plan = this.assess(numbers);
    let explanation = {
      status: "unavailable" as const,
      reason:
        "Google explanations are not configured. The calculation is still available.",
      retryable: false,
    } as Awaited<ReturnType<NonNullable<ExplanationProvider["explainWater"]>>>;
    let audio = silence as Awaited<ReturnType<SpeechProvider["synthesize"]>>;
    if (this.enabled && this.provider.explainWater) {
      const signal = AbortSignal.any([
        requestSignal,
        AbortSignal.timeout(25000),
      ]);
      await this.demo.budget("model", 1);
      explanation = await this.provider.explainWater(
        plan,
        {
          ...numbers,
          locale,
          voice,
          question,
          ...(text ? { text } : {}),
          ...(history ? { history } : {}),
        },
        signal,
      );
      if (explanation.status === "available" && voice) {
        await this.demo.budget("tts", explanation.summary.length);
        audio = await this.speech.synthesize(
          explanation.summary,
          locale,
          signal,
        );
      }
    }
    return waterExplanationSchema.parse({ plan, explanation, audio });
  }
  async transcribe(
    audio: Uint8Array,
    locale: DemoLocale,
    seconds: number,
    requestSignal: AbortSignal,
  ) {
    if (!this.enabled)
      return {
        status: "unavailable",
        reason: "Voice is not configured. Type or choose a question.",
        retryable: false,
      };
    await this.demo.budget("stt", Math.ceil(seconds));
    try {
      const transcript = (
        await this.speech.transcribe(
          audio,
          locale,
          AbortSignal.any([requestSignal, AbortSignal.timeout(25000)]),
        )
      ).trim();
      if (!transcript || transcript.length > 1200)
        throw new Error("Bounded transcript required");
      return { status: "available", transcript };
    } catch {
      return {
        status: "unavailable",
        reason: "We could not hear that clearly. Type or try again.",
        retryable: true,
      };
    }
  }
}
