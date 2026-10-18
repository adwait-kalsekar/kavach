import { z } from "zod";
import {
  assessmentSchema,
  farmContextSchema,
  dateTimeSchema,
  sourceSchema,
} from "./core.js";

export const demoLocaleSchema = z.enum(["en-IN", "hi-IN", "mr-IN"]);
export const demoScenarioId = "latur-chickpea-limited-water" as const;
export const demoInputSchema = z.strictObject({
  scenarioId: z.literal(demoScenarioId),
  changes: z
    .strictObject({ irrigation: z.enum(["none", "one", "assured"]) })
    .optional(),
});
export const demoExplainInputSchema = demoInputSchema
  .extend({
    locale: demoLocaleSchema,
    question: z.enum(["explain-checks", "explain-change"]),
    voice: z.boolean().default(false),
  })
  .refine(
    (v) =>
      v.question !== "explain-change" ||
      (v.changes && v.changes.irrigation !== "one"),
    "A different irrigation constraint is required.",
  );
export const climateSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("available"),
    id: z.string(),
    version: z.literal(1),
    provider: z.string(),
    product: z.string(),
    sourceUrl: z.url(),
    retrievedAt: dateTimeSchema,
    period: z.strictObject({
      start: z.iso.date(),
      end: z.iso.date(),
      label: z.string(),
    }),
    baseline: z.strictObject({
      startYear: z.number().int(),
      endYear: z.number().int(),
      meanMm: z.number().nonnegative(),
      years: z.number().int().positive(),
    }),
    totalMm: z.number().nonnegative(),
    departurePct: z.number().finite(),
    location: z.strictObject({
      latitude: z.number(),
      longitude: z.number(),
      scope: z.enum(["district-centre", "district-mean"]),
      resolution: z.string(),
    }),
    annualTotals: z
      .array(
        z.strictObject({
          year: z.number().int(),
          totalMm: z.number().nonnegative(),
        }),
      )
      .max(40),
    completeDays: z.number().int().positive(),
    limitations: z.array(z.string()),
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    reason: z.string(),
    retryable: z.boolean(),
  }),
]);
export const demoScenariosSchema = z.strictObject({
  demo: z.literal(true),
  persisted: z.literal(false),
  scenarioId: z.literal(demoScenarioId),
  scenarioVersion: z.literal(1),
  label: z.string(),
  context: farmContextSchema,
  climate: climateSchema,
  sources: z.array(sourceSchema),
  locales: z.array(demoLocaleSchema),
});
export const demoAssessmentSchema = z.strictObject({
  demo: z.literal(true),
  persisted: z.literal(false),
  scenarioId: z.literal(demoScenarioId),
  scenarioVersion: z.literal(1),
  baseline: assessmentSchema,
  comparison: assessmentSchema.nullable(),
  climate: climateSchema,
});
export const explanationSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("available"),
    summary: z.string().min(1).max(1200),
    actionIds: z.array(z.string()).max(6),
    model: z.strictObject({
      provider: z.literal("google"),
      id: z.string(),
      version: z.string().nullable(),
      generatedAt: dateTimeSchema,
      cached: z.boolean(),
    }),
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    reason: z.string(),
    retryable: z.boolean(),
  }),
]);
export const audioSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("available"),
    mime: z.literal("audio/mpeg"),
    base64: z.string().max(699052),
    voice: z.string(),
    locale: demoLocaleSchema,
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    reason: z.string(),
    retryable: z.boolean(),
  }),
]);
export const demoExplanationSchema = demoAssessmentSchema.extend({
  explanation: explanationSchema,
  audio: audioSchema,
});
export const demoMessageInputSchema = z.strictObject({
  text: z.string().trim().min(1).max(1200),
  locale: demoLocaleSchema,
  voice: z.boolean().default(false),
});
export const voiceQuerySchema = z.strictObject({ locale: demoLocaleSchema });
export const voiceIntentSchema = z.strictObject({
  intent: z.enum([
    "change-irrigation",
    "explain-checks",
    "explain-change",
    "confirm",
    "change",
    "unsupported",
  ]),
  irrigation: z.enum(["none", "one", "assured"]).nullable(),
});
const interpretedMessageSchema = z.strictObject({
  status: z.literal("available"),
  transcript: z.string().max(1200),
  proposed: voiceIntentSchema,
  needsConfirmation: z.boolean(),
  locale: demoLocaleSchema,
  provider: z.literal("google"),
  audio: audioSchema,
});
const interpretationUnavailableSchema = z.strictObject({
  status: z.literal("unavailable"),
  reason: z.string(),
  retryable: z.boolean(),
});
export const messageInterpretationSchema = z.discriminatedUnion("status", [
  interpretedMessageSchema,
  interpretationUnavailableSchema,
]);
// Keep the existing voice wire contract compatible with the previous web release.
export const transcriptionSchema = z.discriminatedUnion("status", [
  interpretedMessageSchema.extend({ needsConfirmation: z.literal(true) }),
  interpretationUnavailableSchema,
]);
export type DemoLocale = z.infer<typeof demoLocaleSchema>;
export type DemoInput = z.infer<typeof demoInputSchema>;
export type DemoExplainInput = z.infer<typeof demoExplainInputSchema>;
export type DemoAssessment = z.infer<typeof demoAssessmentSchema>;
export type ClimateSnapshot = z.infer<typeof climateSchema>;
export type ExplanationResult = z.infer<typeof explanationSchema>;
export type AudioResult = z.infer<typeof audioSchema>;
export type VoiceIntent = z.infer<typeof voiceIntentSchema>;
