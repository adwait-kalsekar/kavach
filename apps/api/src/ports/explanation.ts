export const EXPLANATION_VERSION = "grounded-summary/3";
import type {
  SeasonAssessment,
  SeasonExplainInput,
  WaterPlan,
  WaterExplainInput,
  DemoAssessment,
  DemoLocale,
  ExplanationResult,
  VoiceIntent,
} from "@kavach/contracts";

export interface ExplanationProvider {
  explainSeason?(
    assessment: SeasonAssessment,
    input: SeasonExplainInput,
    signal: AbortSignal,
    waterPlan?: WaterPlan,
  ): Promise<ExplanationResult>;
  explainWater?(
    plan: WaterPlan,
    input: WaterExplainInput,
    signal: AbortSignal,
  ): Promise<ExplanationResult>;
  explain(
    input: DemoAssessment,
    locale: DemoLocale,
    question: "explain-checks" | "explain-change",
    signal: AbortSignal,
  ): Promise<ExplanationResult>;
  interpret(
    transcript: string,
    locale: DemoLocale,
    signal: AbortSignal,
  ): Promise<VoiceIntent>;
}
export class DisabledExplanation implements ExplanationProvider {
  async explain(): Promise<ExplanationResult> {
    return {
      status: "unavailable",
      reason:
        "Google explanations are not configured. Your planning checks still work.",
      retryable: false,
    };
  }
  async interpret(): Promise<VoiceIntent> {
    return { intent: "unsupported", irrigation: null };
  }
}
