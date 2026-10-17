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
  ai: z.literal("unavailable"),
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

export const endpoints = {
  capabilities: {
    method: "GET",
    path: "/api/v1/capabilities",
    response: envelope(capabilitiesSchema),
    status: 200,
  },
  session: {
    method: "GET",
    path: "/api/v1/session",
    response: envelope(sessionSchema),
    status: 200,
  },
  createSession: {
    method: "POST",
    path: "/api/v1/session",
    body: emptyBodySchema,
    response: envelope(sessionSchema),
    status: 201,
  },
  revokeSession: {
    method: "DELETE",
    path: "/api/v1/session",
    body: emptyBodySchema,
    response: envelope(revokedSchema),
    status: 200,
  },
  createFarm: {
    method: "POST",
    path: "/api/v1/farms",
    body: createFarmSchema,
    response: envelope(farmSchema),
    status: 201,
    idempotent: true,
  },
  getFarm: {
    method: "GET",
    path: "/api/v1/farms/{id}",
    response: envelope(farmSchema),
    status: 200,
  },
  updateFarm: {
    method: "PATCH",
    path: "/api/v1/farms/{id}",
    body: updateFarmSchema,
    response: envelope(farmSchema),
    status: 200,
  },
  createAssessment: {
    method: "POST",
    path: "/api/v1/assessments",
    body: createAssessmentSchema,
    response: envelope(assessmentSchema),
    status: 201,
    idempotent: true,
  },
  getAssessment: {
    method: "GET",
    path: "/api/v1/assessments/{id}",
    response: envelope(assessmentSchema),
    status: 200,
  },
  compare: {
    method: "POST",
    path: "/api/v1/assessments/{id}/compare",
    body: comparisonSchema,
    response: envelope(assessmentSchema),
    status: 201,
    idempotent: true,
  },
  createPlan: {
    method: "POST",
    path: "/api/v1/plans",
    body: createPlanSchema,
    response: envelope(planSchema),
    status: 201,
    idempotent: true,
  },
  getPlan: {
    method: "GET",
    path: "/api/v1/plans/{id}",
    response: envelope(planSchema),
    status: 200,
  },
  listPlans: {
    method: "GET",
    path: "/api/v1/plans",
    response: envelope(planPageSchema),
    status: 200,
  },
  updatePlan: {
    method: "PATCH",
    path: "/api/v1/plans/{id}",
    body: updatePlanSchema,
    response: envelope(planSchema),
    status: 200,
  },
} as const;
export type Operation = keyof typeof endpoints;
export type RequestBody<K extends Operation> = (typeof endpoints)[K] extends {
  body: infer B extends z.ZodType;
}
  ? z.input<B>
  : never;
export type ResponseBody<K extends Operation> = z.output<
  (typeof endpoints)[K]["response"]
>;

export function openApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [name, endpoint] of Object.entries(endpoints)) {
    const params: unknown[] = endpoint.path.includes("{id}")
      ? [
          {
            in: "path",
            name: "id",
            required: true,
            schema: z.toJSONSchema(idSchema),
          },
        ]
      : [];
    if ("idempotent" in endpoint)
      params.push({
        in: "header",
        name: "Idempotency-Key",
        required: true,
        schema: { type: "string", format: "uuid" },
      });
    if (endpoint.method !== "GET")
      params.push(
        {
          in: "header",
          name: "X-CSRF-Token",
          required: true,
          schema: { type: "string" },
        },
        {
          in: "header",
          name: "Origin",
          required: true,
          schema: { type: "string", format: "uri" },
        },
      );
    if (name === "listPlans")
      params.push(
        {
          in: "query",
          name: "limit",
          schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        },
        {
          in: "query",
          name: "cursor",
          schema: { type: "string", maxLength: 512 },
        },
      );
    const publicOp =
      name === "capabilities" || name === "session" || name === "createSession";
    const responses: Record<string, unknown> = {
      [endpoint.status]: {
        description: "Successful response",
        content: {
          "application/json": { schema: z.toJSONSchema(endpoint.response) },
        },
      },
    };
    for (const status of [400, 401, 403, 404, 409, 413, 415, 429, 500, 503])
      responses[status] = {
        description: "Structured API error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      };
    (paths[endpoint.path] ||= {})[endpoint.method.toLowerCase()] = {
      operationId: name,
      parameters: params,
      security: publicOp ? [] : [{ sessionCookie: [] }],
      ...("body" in endpoint
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: z.toJSONSchema(endpoint.body, { io: "input" }),
                },
              },
            },
          }
        : {}),
      responses,
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Kavach API",
      version: "0.1.0",
      description:
        "Browser → Hono only. Bootstrap CSRF with GET /session; create a guest session; send cookie, Origin and X-CSRF-Token on mutations. Reads/creates are owner-scoped. AI conversations and account login are not implemented. Idempotency keys expire after 24 hours. Revision checks are mandatory. Comparison changes must be nonempty; blocked tasks require a blocker and all other task states require null. CSRF/origin policy applies even where session creation has no account-login security requirement.",
    },
    servers: [{ url: "/" }],
    components: {
      schemas: { ApiError: z.toJSONSchema(errorSchema) },
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "__Host-kavach_session",
          description:
            "Production cookie; local development uses kavach_session. Both are HTTP-only.",
        },
      },
    },
    paths,
  };
}
