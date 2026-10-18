import { z } from "zod";

export const API_VERSION = "v1";
export const idSchema = z.uuid();
export const dateTimeSchema = z.iso.datetime();
export const revisionSchema = z.number().int().positive();
export const metaSchema = z.strictObject({ requestId: idSchema });
export const errorCodes = [
  "VALIDATION_ERROR",
  "INVALID_JSON",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "UNSUPPORTED_MEDIA_TYPE",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;
export const errorSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(errorCodes),
    message: z.string(),
    requestId: idSchema,
    retryable: z.boolean(),
    issues: z
      .array(z.strictObject({ path: z.string(), message: z.string() }))
      .optional(),
  }),
});
export type ErrorCode = (typeof errorCodes)[number];
export type ApiErrorBody = z.infer<typeof errorSchema>;
export const envelope = <T extends z.ZodType>(schema: T) =>
  z.strictObject({ data: schema, meta: metaSchema });

export const farmContextSchema = z.strictObject({
  district: z.literal("Latur"),
  crop: z.literal("chickpea"),
  stage: z.enum(["planning", "vegetative", "flowering", "pod-development"]),
  irrigation: z.enum(["none", "one", "assured"]),
  moisture: z.enum(["unknown", "dry", "adequate"]),
  seedAvailable: z.boolean(),
  language: z.enum(["en", "hi", "mr"]),
});
export type FarmContext = z.infer<typeof farmContextSchema>;
export const farmSchema = z.strictObject({
  id: idSchema,
  schemaVersion: z.literal(1),
  context: farmContextSchema,
  revision: revisionSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Farm = z.infer<typeof farmSchema>;
export const createFarmSchema = z.strictObject({ context: farmContextSchema });
export const updateFarmSchema = z.strictObject({
  context: farmContextSchema,
  expectedRevision: revisionSchema,
});

export const provenanceSchema = z.strictObject({
  provider: z.string().min(1),
  product: z.string().min(1),
  productVersion: z.string().min(1),
  sourceUrl: z.url(),
  retrievedAt: dateTimeSchema,
  forecastIssuedAt: dateTimeSchema.nullable(),
  location: z.strictObject({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    scope: z.literal("district-centre"),
  }),
  resolutionDescription: z.string().min(1),
});
export const forecastDaySchema = z.strictObject({
  date: z.iso.date(),
  rainMm: z.number().finite().min(0).max(2000),
  maxC: z.number().finite().min(-30).max(65),
});
export const weatherSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("available"),
    days: z.array(forecastDaySchema).length(7),
    provenance: provenanceSchema,
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    reason: z.string().min(1),
    retryable: z.boolean(),
  }),
]);
export type Weather = z.infer<typeof weatherSchema>;
export const actionSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string(),
  detail: z.string(),
  condition: z.string(),
  kind: z.enum(["verify", "planning-check", "blocked"]),
  reviewStatus: z.literal("unreviewed"),
  sourceIds: z.array(z.string()),
});
export const assessmentSchema = z.strictObject({
  id: idSchema,
  schemaVersion: z.literal(1),
  farmId: idSchema,
  farmRevision: revisionSchema,
  context: farmContextSchema,
  ruleVersion: z.string(),
  createdAt: dateTimeSchema,
  mode: z.enum(["confirmed", "hypothetical"]),
  basedOnAssessmentId: idSchema.nullable(),
  readiness: z.enum(["needs-check", "constrained", "planning-review"]),
  headline: z.string(),
  reasons: z.array(z.string()),
  actions: z.array(actionSchema),
  weather: weatherSchema,
  limitations: z.array(z.string()),
});
export type Assessment = z.infer<typeof assessmentSchema>;
export const createAssessmentSchema = z.strictObject({
  farmId: idSchema,
  expectedFarmRevision: revisionSchema,
});
export const comparisonSchema = z.strictObject({
  changes: farmContextSchema
    .omit({ district: true, crop: true })
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "Provide at least one changed constraint.",
    ),
});
export const createPlanSchema = z.strictObject({ assessmentId: idSchema });
export const taskStateSchema = z
  .strictObject({
    actionId: z.string().min(1).max(80),
    status: z.enum(["pending", "reviewed", "blocked"]),
    blocker: z.enum(["water", "seed", "local-check", "other"]).nullable(),
  })
  .refine(
    (t) => (t.status === "blocked" ? t.blocker !== null : t.blocker === null),
    "Only a blocked step must have a blocker.",
  );
export const updatePlanSchema = z
  .strictObject({
    expectedRevision: revisionSchema,
    tasks: z.array(taskStateSchema).max(12),
  })
  .refine(
    (v) => new Set(v.tasks.map((t) => t.actionId)).size === v.tasks.length,
    "Action IDs must be unique.",
  );
export const planSchema = z.strictObject({
  id: idSchema,
  schemaVersion: z.literal(1),
  assessmentId: idSchema,
  revision: revisionSchema,
  tasks: z.array(taskStateSchema),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Plan = z.infer<typeof planSchema>;
export const planPageSchema = z.strictObject({
  items: z.array(planSchema).max(50),
  nextCursor: z.string().nullable(),
});
export const sessionSchema = z.strictObject({
  status: z.enum(["bootstrap", "guest"]),
  csrfToken: z.string().min(32),
  expiresAt: dateTimeSchema,
});
export const sourceSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  applicability: z.string(),
  reviewStatus: z.literal("unreviewed"),
});
export const capabilitiesSchema = z.strictObject({
  apiVersion: z.literal("v1"),
  environment: z.enum(["local", "test", "production"]),
  persistence: z.enum(["sqlite", "firestore"]),
  weather: z.enum(["disabled", "open-meteo"]),
  ai: z.enum(["google", "unavailable"]),
  conversations: z.literal(false),
  supported: z.array(
    z.strictObject({
      district: z.literal("Latur"),
      crop: z.literal("chickpea"),
    }),
  ),
  sources: z.array(sourceSchema),
});
export const emptyBodySchema = z.strictObject({});
export const revokedSchema = z.strictObject({ revoked: z.literal(true) });
export const listQuerySchema = z.strictObject({
  limit: z
    .string()
    .regex(/^(?:[1-9]|[1-4][0-9]|50)$/)
    .optional(),
  cursor: z.string().min(1).max(512).optional(),
});

export const healthSchema = z.strictObject({
  status: z.literal("ok"),
  service: z.literal("kavach-api"),
  apiVersion: z.literal("v1"),
  checkedAt: dateTimeSchema,
});
