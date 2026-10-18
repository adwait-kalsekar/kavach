import {
  seasonInputSchema,
  seasonAssessmentSchema,
  seasonExplainInputSchema,
  seasonExplanationSchema,
} from "./season-readiness.js";
import {
  planningTranscriptSchema,
  planningCatalogSchema,
  waterPlanningInputSchema,
  waterPlanSchema,
  waterExplainInputSchema,
  waterExplanationSchema,
} from "./water-planning.js";
import { z } from "zod";
import {
  idSchema,
  errorSchema,
  envelope,
  farmSchema,
  createFarmSchema,
  updateFarmSchema,
  assessmentSchema,
  createAssessmentSchema,
  comparisonSchema,
  createPlanSchema,
  updatePlanSchema,
  planSchema,
  planPageSchema,
  sessionSchema,
  capabilitiesSchema,
  emptyBodySchema,
  revokedSchema,
  healthSchema,
} from "./core.js";
import {
  demoInputSchema,
  demoExplainInputSchema,
  demoScenariosSchema,
  demoAssessmentSchema,
  demoExplanationSchema,
  transcriptionSchema,
  demoMessageInputSchema,
  messageInterpretationSchema,
} from "./demo.js";
export * from "./core.js";
export * from "./demo.js";
export * from "./water-planning.js";
export * from "./season-readiness.js";

export const endpoints = {
  demoReadiness: {
    method: "POST",
    path: "/api/v1/demo/readiness",
    publicDemo: true,
    body: seasonInputSchema,
    response: envelope(seasonAssessmentSchema),
    status: 200,
  },
  demoReadinessExplain: {
    method: "POST",
    path: "/api/v1/demo/readiness/explain",
    publicDemo: true,
    body: seasonExplainInputSchema,
    response: envelope(seasonExplanationSchema),
    status: 200,
  },
  planningTranscribe: {
    method: "POST",
    path: "/api/v1/demo/planning/transcribe",
    publicDemo: true,
    binary: true,
    response: envelope(planningTranscriptSchema),
    status: 200,
  },
  planningCatalog: {
    method: "GET",
    path: "/api/v1/demo/planning",
    publicDemo: true,
    response: envelope(planningCatalogSchema),
    status: 200,
  },
  demoWaterPlan: {
    method: "POST",
    path: "/api/v1/demo/water-plan",
    publicDemo: true,
    body: waterPlanningInputSchema,
    response: envelope(waterPlanSchema),
    status: 200,
  },
  demoWaterExplain: {
    method: "POST",
    path: "/api/v1/demo/water-plan/explain",
    publicDemo: true,
    body: waterExplainInputSchema,
    response: envelope(waterExplanationSchema),
    status: 200,
  },
  demoScenarios: {
    method: "GET",
    path: "/api/v1/demo/scenarios",
    publicDemo: true,
    response: envelope(demoScenariosSchema),
    status: 200,
  },
  demoAssess: {
    method: "POST",
    path: "/api/v1/demo/assess",
    publicDemo: true,
    body: demoInputSchema,
    response: envelope(demoAssessmentSchema),
    status: 200,
  },
  demoExplain: {
    method: "POST",
    path: "/api/v1/demo/explain",
    publicDemo: true,
    body: demoExplainInputSchema,
    response: envelope(demoExplanationSchema),
    status: 200,
  },
  demoMessage: {
    method: "POST",
    path: "/api/v1/demo/message",
    publicDemo: true,
    body: demoMessageInputSchema,
    response: envelope(messageInterpretationSchema),
    status: 200,
  },
  demoTranscribe: {
    method: "POST",
    path: "/api/v1/demo/transcribe",
    publicDemo: true,
    binary: true,
    response: envelope(transcriptionSchema),
    status: 200,
  },
  health: {
    method: "GET",
    path: "/api/v1/health",
    response: envelope(healthSchema),
    status: 200,
  },
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
    if (endpoint.method !== "GET") {
      if (!("publicDemo" in endpoint))
        params.push({
          in: "header",
          name: "X-CSRF-Token",
          required: true,
          schema: { type: "string" },
        });
      params.push({
        in: "header",
        name: "Origin",
        required: true,
        schema: { type: "string", format: "uri" },
      });
    }
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
      "publicDemo" in endpoint ||
      name === "health" ||
      name === "capabilities" ||
      name === "session" ||
      name === "createSession";
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
      ...("binary" in endpoint
        ? {
            parameters: [
              ...params,
              {
                in: "query",
                name: "locale",
                required: true,
                schema: { type: "string", enum: ["en-IN", "hi-IN", "mr-IN"] },
              },
            ],
            requestBody: {
              required: true,
              content: {
                "audio/wav": {
                  schema: {
                    type: "string",
                    format: "binary",
                    description: "PCM16 mono 16kHz, at most 30s / 1 MiB.",
                  },
                },
              },
            },
          }
        : "body" in endpoint
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
