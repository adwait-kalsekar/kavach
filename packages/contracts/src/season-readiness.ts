import { protectionAssessmentSchema } from "./protection.js";
import { waterPlanningInputSchema, waterPlanSchema } from "./water-planning.js";
import { z } from "zod";
import { demoLocaleSchema, explanationSchema, audioSchema } from "./demo.js";
export const seasonRegionSchema = z.enum([
  "latur",
  "beed",
  "nanded",
  "dharashiv",
  "parbhani",
  "hingoli",
  "jalna",
  "sambhajinagar",
  "solapur",
  "ahilyanagar",
]);
export const seasonInputSchema = z.strictObject({
  contextVersion: z.literal(2).optional(),
  regionId: seasonRegionSchema,
  crop: z.enum(["chickpea", "sorghum", "wheat"]),
  intent: z.enum(["sowing", "growing", "water"]),
  stage: z.enum([
    "pre-sowing",
    "vegetative",
    "crown-root",
    "branching",
    "boot-leaf",
    "pod-development",
    "grain-filling",
    "flowering",
    "maturity",
  ]),
  soil: z.enum(["unknown", "shallow", "medium-deep"]),
  moisture: z.enum(["unknown", "dry", "moist"]),
  irrigation: z.enum(["unknown", "none", "one", "limited", "assured"]),
  soilType: z.enum(["unknown", "black", "other"]).default("unknown"),
  wellRecharge: z
    .enum(["unknown", "not-refilled", "not-applicable"])
    .default("unknown"),
});
const finite = z.number().finite();
export const seasonSourceSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  retrievedAt: z.iso.datetime({ offset: true }),
  product: z.string(),
  scope: z.string(),
  resolution: z.string(),
  limitation: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export const regionEvidenceSchema = z.strictObject({
  regionId: seasonRegionSchema,
  name: z.string(),
  latitude: finite,
  longitude: finite,
  rainfall: z.strictObject({
    source: seasonSourceSchema,
    start: z.iso.date(),
    end: z.iso.date(),
    baselineStart: z.literal(1991),
    baselineEnd: z.literal(2020),
    baselineMeanMm: finite.positive(),
    totalMm: finite.nonnegative(),
    departurePct: finite,
    completeDays: z.literal(122),
    baselineTotals: z
      .array(
        z.strictObject({
          year: z.number().int(),
          totalMm: finite.nonnegative(),
        }),
      )
      .length(30),
    history: z
      .array(
        z.strictObject({
          year: z.number().int(),
          totalMm: finite.nonnegative(),
          departurePct: finite,
          oni: finite,
        }),
      )
      .length(4),
  }),
  surface: z.strictObject({
    source: seasonSourceSchema,
    start: z.iso.date(),
    end: z.iso.date(),
    moisture: finite.min(0).max(1),
    baselineMoisture: finite.min(0).max(1),
    meanDailyMaxC: finite,
    baselineDailyMaxC: finite,
    completeDays: z.literal(30),
    baselineMoistureTotals: z
      .array(
        z.strictObject({ year: z.number().int(), value: finite.min(0).max(1) }),
      )
      .length(30),
  }),
  enso: z.strictObject({
    source: seasonSourceSchema,
    period: z.string(),
    anomalyC: finite,
    limitation: z.string(),
  }),
});
export const cropGuidanceSchema = z.strictObject({
  id: z.string(),
  crop: seasonInputSchema.shape.crop,
  regionId: seasonRegionSchema.nullable(),
  stages: z.array(seasonInputSchema.shape.stage).min(1),
  irrigation: z.array(seasonInputSchema.shape.irrigation).min(1),
  confirmationChecks: z.array(z.string()).default([]),
  requiresTwoStageSupply: z.boolean().default(false),
  requiresDryField: z.boolean(),
  requiresBlackDeepSoil: z.boolean(),
  requiresLowWellRecharge: z.boolean(),
  title: z.string(),
  detail: z.string(),
  timing: z.string(),
  sourceCondition: z.string(),
  source: z.strictObject({
    title: z.string(),
    url: z.url(),
    section: z.string(),
    pdfPage: z.number().int().positive().nullable(),
    sha256: z.string(),
    scope: z.enum(["general-crop-guidance", "district-contingency"]),
  }),
  review: z.literal("unreviewed"),
});
export const cropRulePackSchema = z.strictObject({
  regionId: seasonRegionSchema,
  crop: seasonInputSchema.shape.crop,
  version: z.literal("maharashtra-rabi-context/1"),
  review: z.literal("unreviewed"),
  guidance: z.array(cropGuidanceSchema).max(8).default([]),
  source: z.strictObject({
    title: z.string(),
    url: z.url(),
    pdfPage: z.number().int().positive(),
    publishedYear: z.literal(2011),
    sha256: z.string(),
  }),
  rainfedWindow: z.string().nullable(),
  irrigatedWindow: z.string().nullable(),
  bulletin: z
    .strictObject({
      url: z.url(),
      pdfPage: z.number().int().positive(),
      issued: z.iso.date(),
      forecastThrough: z.iso.date(),
      sowingWindowThrough: z.iso.date(),
    })
    .nullable(),
});
export const seasonActionSchema = z.strictObject({
  id: z.string(),
  kind: z.enum(["field-check", "water-check", "source-check", "crop-check"]),
  title: z.string(),
  detail: z.string(),
  when: z.string(),
  sourceUrl: z.url(),
  sourceTitle: z.string(),
  sourcePage: z.number().int().positive(),
  reason: z.string(),
  status: z.literal("verification-needed"),
});
export const seasonAssessmentSchema = z.strictObject({
  demo: z.literal(true),
  persisted: z.literal(false),
  methodVersion: z.literal("season-readiness/1"),
  assessedAt: z.iso.datetime(),
  input: seasonInputSchema,
  evidence: regionEvidenceSchema,
  cropContext: cropRulePackSchema,
  stress: z.strictObject({
    methodVersion: z.literal("experimental-regional-stress/1"),
    level: z.enum(["high", "moderate", "lower"]),
    rainDryRankPct: finite.min(0).max(100),
    surfaceDryRankPct: finite.min(0).max(100),
    limitation: z.string(),
  }),
  protection: protectionAssessmentSchema.optional(),
  cropOptions: z
    .array(
      z.strictObject({
        rule: cropGuidanceSchema,
        status: z.enum([
          "reported-context-matches",
          "needs-input",
          "different-context",
        ]),
        missing: z.array(z.string()),
        reason: z.string(),
      }),
    )
    .max(8),
  regionalSignal: z.enum(["below-baseline", "at-or-above-baseline"]),
  readiness: z.enum([
    "needs-field-check",
    "needs-water-check",
    "needs-current-guidance",
  ]),
  missing: z.array(
    z.enum([
      "field-moisture",
      "soil-depth",
      "irrigation-certainty",
      "current-reviewed-guidance",
    ]),
  ),
  actions: z.array(seasonActionSchema).min(1).max(4),
  guidanceStatus: z.enum([
    "dated-bulletin",
    "expired-bulletin",
    "historical-only",
  ]),
  limitations: z.array(z.string()).min(1),
});
export const seasonViewSchema = z.enum([
  "season-summary",
  "rain-history",
  "surface-context",
  "crop-actions",
  "water-comparison",
  "insurance-check",
]);
export const seasonExplainInputSchema = seasonInputSchema
  .extend({
    water: waterPlanningInputSchema.optional(),
    locale: demoLocaleSchema,
    voice: z.boolean().default(false),
    question: z.enum(["season", "history", "actions", "water", "protection"]),
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
  })
  .refine(
    (v) =>
      !v.water || (v.water.regionId === v.regionId && v.water.crop === v.crop),
    "Water comparison must match the selected region/crop",
  )
  .refine(
    (v) => v.question !== "protection" || v.contextVersion === 2,
    "Protection requires contextVersion 2",
  );
export const seasonExplanationSchema = z.strictObject({
  assessment: seasonAssessmentSchema,
  waterPlan: waterPlanSchema.optional(),
  explanation: explanationSchema,
  audio: audioSchema,
  components: z.strictObject({
    version: z.literal(1),
    replyStyle: z.enum(["standard", "one-line", "simple"]).optional(),
    views: z.array(seasonViewSchema).min(1).max(4),
  }),
});
export type CropGuidance = z.infer<typeof cropGuidanceSchema>;
export type SeasonInput = z.infer<typeof seasonInputSchema>;
export type RegionEvidence = z.infer<typeof regionEvidenceSchema>;
export type CropRulePack = z.infer<typeof cropRulePackSchema>;
export type SeasonAssessment = z.infer<typeof seasonAssessmentSchema>;
export type SeasonExplainInput = z.infer<typeof seasonExplainInputSchema>;
export type SeasonView = z.infer<typeof seasonViewSchema>;
