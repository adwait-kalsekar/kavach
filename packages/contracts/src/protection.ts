import { z } from "zod";
import { planningCropSchema } from "./water-planning.js";
export const protectionActionIdSchema = z.enum([
  "verify-notification",
  "prepare-records",
  "official-application",
  "retain-receipt",
]);
export const protectionPolicySchema = z.strictObject({
  id: z.literal("maharashtra-pmfby-rabi-2026-27"),
  version: z.literal(1),
  state: z.literal("Maharashtra"),
  season: z.literal("Rabi 2026–27"),
  checkedOn: z.iso.date(),
  recheckOn: z.iso.date(),
  source: z.strictObject({
    title: z.string(),
    url: z.url(),
    issued: z.iso.date(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    calendarPage: z.number().int().positive(),
    scopePage: z.number().int().positive(),
  }),
  portalUrl: z.literal("https://pmfby.gov.in/"),
  crops: z
    .array(
      z.strictObject({
        crop: planningCropSchema,
        calendarCrop: z.string(),
        deadline: z.iso.date(),
        irrigationCondition: z.enum([
          "not-separated-in-calendar",
          "irrigated-only",
        ]),
      }),
    )
    .length(3),
  actions: z
    .array(
      z.strictObject({
        id: protectionActionIdSchema,
        sourcePages: z.array(z.number().int().positive()).min(1).max(3),
      }),
    )
    .length(4),
});
export const protectionAssessmentSchema = z.strictObject({
  policy: protectionPolicySchema,
  crop: planningCropSchema,
  calendarCrop: z.string(),
  publishedDeadline: z.iso.date(),
  assessedOn: z.iso.date(),
  daysToPublishedDate: z.number().int(),
  status: z.enum([
    "verify-eligibility",
    "irrigation-context-differs",
    "published-date-passed",
    "source-recheck-needed",
    "source-not-issued-yet",
  ]),
  eligibility: z.literal("unverified"),
  cropContext: z.enum([
    "needs-irrigation-confirmation",
    "reported-irrigation-differs",
    "category-requires-portal-confirmation",
  ]),
  missing: z
    .array(
      z.enum([
        "notified-village-and-crop",
        "current-portal-calendar",
        "irrigated-wheat-category",
        "land-and-sowing-records",
        "aadhaar-linked-bank-details",
      ]),
    )
    .min(1),
  timingPrecision: z.literal(
    "Published calendar date; portal cutoff time and later amendments are not confirmed.",
  ),
  limitation: z.literal(
    "A state policy calendar does not establish personal eligibility, enrollment, premium or claim approval.",
  ),
});
export type ProtectionPolicy = z.infer<typeof protectionPolicySchema>;
export type ProtectionAssessment = z.infer<typeof protectionAssessmentSchema>;
