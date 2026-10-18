import { z } from "zod";
import {
  climateSchema,
  demoLocaleSchema,
  explanationSchema,
  audioSchema,
} from "./demo.js";
export const planningRegionSchema = z.enum(["latur", "beed", "nanded"]);
export const planningCropSchema = z.enum(["chickpea", "sorghum", "wheat"]);
const positive = (max: number) => z.number().finite().positive().max(max);
export const waterPlanningInputSchema = z.strictObject({
  regionId: planningRegionSchema,
  crop: planningCropSchema,
  plannedAreaAcres: positive(100).min(0.1),
  alternativeAreaAcres: positive(100).min(0.1),
  usableWaterLitres: z
    .number()
    .finite()
    .nonnegative()
    .max(100000000)
    .nullable(),
  netApplicationMm: positive(300).min(1).nullable(),
  efficiencyPct: positive(100).min(1).nullable(),
});
const common = {
  inputs: waterPlanningInputSchema,
  methodVersion: z.literal("water-volume/1"),
  assumptionsStatus: z.literal("illustrative"),
  agronomicReview: z.literal("unreviewed"),
};
export const waterPlanningResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...common,
    status: z.literal("needs-input"),
    missingInputs: z
      .array(z.enum(["usable-water", "application-depth", "efficiency"]))
      .min(1)
      .max(3),
  }),
  z.strictObject({
    ...common,
    status: z.literal("available"),
    coveredAreaAcres: z.number().finite().nonnegative(),
    options: z
      .array(
        z.strictObject({
          id: z.enum(["planned", "alternative"]),
          areaAcres: positive(100),
          requiredWaterLitres: z.number().finite().positive(),
          balanceLitres: z.number().finite(),
          coverageFraction: z.number().min(0).max(1),
        }),
      )
      .length(2),
  }),
]);
export const planningCatalogSchema = z.strictObject({
  demo: z.literal(true),
  persisted: z.literal(false),
  regions: z
    .array(
      z.strictObject({
        id: planningRegionSchema,
        name: z.string(),
        climate: climateSchema,
      }),
    )
    .length(3),
  crops: z
    .array(z.strictObject({ id: planningCropSchema, name: z.string() }))
    .length(3),
});
export const waterPlanSchema = z.strictObject({
  demo: z.literal(true),
  persisted: z.literal(false),
  calculation: waterPlanningResultSchema,
  regionName: z.string(),
  climate: climateSchema,
  method: z.strictObject({
    title: z.string(),
    url: z.url(),
    limitation: z.string(),
  }),
});
export const waterExplainInputSchema = waterPlanningInputSchema.extend({
  locale: demoLocaleSchema,
  voice: z.boolean().default(false),
  question: z.enum([
    "explain-coverage",
    "explain-assumptions",
    "explain-next-checks",
  ]),
  text: z.string().trim().min(1).max(1200).optional(),
  history: z
    .array(
      z.strictObject({
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1).max(600),
      }),
    )
    .max(6)
    .optional(),
});
export const waterExplanationSchema = z.strictObject({
  plan: waterPlanSchema,
  explanation: explanationSchema,
  audio: audioSchema,
});
export type WaterPlanningInput = z.infer<typeof waterPlanningInputSchema>;
export type WaterPlanningResult = z.infer<typeof waterPlanningResultSchema>;
export type WaterPlan = z.infer<typeof waterPlanSchema>;
export type WaterExplainInput = z.infer<typeof waterExplainInputSchema>;

export const planningTranscriptSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("available"),
    transcript: z.string().min(1).max(1200),
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    reason: z.string(),
    retryable: z.boolean(),
  }),
]);
