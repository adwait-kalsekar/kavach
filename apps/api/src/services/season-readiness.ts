import guidanceRaw from "../evidence/season-readiness/crop-guidance.json" with { type: "json" };
import { z } from "zod";
import {
  cropGuidanceSchema,
  regionEvidenceSchema,
  cropRulePackSchema,
  seasonViewSchema,
  seasonExplanationSchema,
  type SeasonInput,
  type SeasonExplainInput,
} from "@kavach/contracts";
import { assessSeason } from "@kavach/domain";
import regionsRaw from "../evidence/season-readiness/regions.json" with { type: "json" };
import rulesRaw from "../evidence/season-readiness/actions.json" with { type: "json" };
import type { WaterPlanningService } from "./water-planning.js";
import type { DemoService } from "./demo.js";
import type { ExplanationProvider } from "../ports/explanation.js";
import type { SpeechProvider } from "../ports/speech.js";
const regions = z.array(regionEvidenceSchema).length(10).parse(regionsRaw);
const guidance = z.array(cropGuidanceSchema).min(3).max(50).parse(guidanceRaw);
const rules = z
  .array(cropRulePackSchema)
  .length(30)
  .parse(rulesRaw)
  .map((r) => ({
    ...r,
    guidance: guidance.filter(
      (g) => g.crop === r.crop && (!g.regionId || g.regionId === r.regionId),
    ),
  }));
if (
  new Set(regions.map((r) => r.regionId)).size !== 10 ||
  new Set(rules.map((r) => r.regionId + ":" + r.crop)).size !== 30
)
  throw Error("Duplicate region/crop packs");
export class SeasonReadinessService {
  constructor(
    private demo: DemoService,
    private provider: ExplanationProvider,
    private speech: SpeechProvider,
    private enabled: boolean,
    private now: () => Date,
    private planning: WaterPlanningService,
  ) {}
  assess(input: SeasonInput) {
    return assessSeason(
      input,
      regions.find((r) => r.regionId === input.regionId)!,
      rules.find(
        (r) => r.regionId === input.regionId && r.crop === input.crop,
      )!,
      this.now().toISOString(),
    );
  }
  async explain(input: SeasonExplainInput, requestSignal: AbortSignal) {
    const { locale, voice, question, text, history, water, ...context } = input;
    const assessment = this.assess(context);
    const waterPlan = water ? this.planning.assess(water) : undefined;
    let explanation = {
      status: "unavailable" as const,
      reason:
        "Google explanations are not configured. Your evidence and checks remain available.",
      retryable: false,
    } as Awaited<ReturnType<NonNullable<ExplanationProvider["explainSeason"]>>>;
    let audio = {
      status: "unavailable" as const,
      reason: "Voice playback was not requested.",
      retryable: false,
    } as Awaited<ReturnType<SpeechProvider["synthesize"]>>;
    if (this.enabled && this.provider.explainSeason) {
      const signal = AbortSignal.any([
        requestSignal,
        AbortSignal.timeout(25000),
      ]);
      await this.demo.budget("model", 1);
      explanation = await this.provider.explainSeason(
        assessment,
        {
          ...context,
          locale,
          voice,
          question,
          ...(text ? { text } : {}),
          ...(history ? { history } : {}),
          ...(water ? { water } : {}),
        },
        signal,
        waterPlan,
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
    // Server binds all views to this recomputed result; no model-generated facts/HTML.
    const selected =
      explanation.status === "available"
        ? explanation.actionIds
            .filter(
              (id) =>
                seasonViewSchema.safeParse(id).success &&
                (id !== "water-comparison" || waterPlan),
            )
            .slice(0, 2)
        : [];
    const views = selected.length
      ? selected
      : question === "history"
        ? ["rain-history"]
        : question === "actions"
          ? ["crop-actions"]
          : question === "water" && waterPlan
            ? ["water-comparison"]
            : question === "water"
              ? ["surface-context", "crop-actions"]
              : ["season-summary", "rain-history"];
    return seasonExplanationSchema.parse({
      assessment,
      ...(waterPlan ? { waterPlan } : {}),
      explanation,
      audio,
      components: { version: 1, views },
    });
  }
}
