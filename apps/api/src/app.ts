import { randomUUID } from "node:crypto";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import {
  demoInputSchema,
  demoExplainInputSchema,
  voiceQuerySchema,
  endpoints,
  errorSchema,
  idSchema,
  listQuerySchema,
  openApiDocument,
  type Operation,
  type ResponseBody,
} from "@kavach/contracts";
import { sourceReferences } from "@kavach/domain";
import type { Config } from "./config.js";
import type { Store } from "./ports/store.js";
import type { WeatherProvider } from "./ports/weather.js";
import { ServiceError } from "./errors.js";
import {
  SessionService,
  consumeQuota,
  equalSecret,
  type Session,
} from "./services/session.js";
import { DemoService } from "./services/demo.js";
import { readVoice } from "./services/voice-upload.js";
import {
  DisabledExplanation,
  type ExplanationProvider,
} from "./ports/explanation.js";
import { DisabledSpeech, type SpeechProvider } from "./ports/speech.js";
import { ResourceService } from "./services/resources.js";

type Bindings = {
  Variables: {
    requestId: string;
    session: Session;
    ownerId: string;
    idempotencyKey: string;
  };
};
type Ctx = Context<Bindings>;
type Dependencies = {
  config: Config;
  store: Store;
  weather: WeatherProvider;
  now?: () => Date;
  explanation?: ExplanationProvider;
  speech?: SpeechProvider;
};

async function readBody(c: Ctx): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("content-type") || ""))
    throw new ServiceError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send application/json.",
    );
  if (Number(c.req.header("content-length")) > 16384)
    throw new ServiceError(413, "PAYLOAD_TOO_LARGE", "Request exceeds 16 KiB.");
  const reader = c.req.raw.body?.getReader();
  if (!reader)
    throw new ServiceError(
      400,
      "INVALID_JSON",
      "A JSON request body is required.",
    );
  const chunks: Uint8Array[] = [];
  let total = 0;
  const timer = setTimeout(() => {
    void reader.cancel();
  }, 5000);
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 16384) {
        await reader.cancel();
        throw new ServiceError(
          413,
          "PAYLOAD_TOO_LARGE",
          "Request exceeds 16 KiB.",
        );
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      400,
      "INVALID_JSON",
      "The body must contain valid JSON.",
    );
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export function createApp({
  config,
  store,
  weather,
  explanation = new DisabledExplanation(),
  speech = new DisabledSpeech(),
  now = () => new Date(),
}: Dependencies) {
  const app = new Hono<Bindings>();
  const sessions = new SessionService(store, config, now);
  const resources = new ResourceService(store, weather, now);
  const demo = new DemoService(store, config, explanation, speech, now);
  const cookieOptions = {
    httpOnly: true,
    secure: config.environment === "production",
    sameSite: "Lax" as const,
    path: "/",
  };
  const writeCookie = (c: Ctx, token: string, ttl: number) =>
    setCookie(c, config.cookieName, token, { ...cookieOptions, maxAge: ttl });

  app.use("*", async (c, next) => {
    c.set("requestId", randomUUID());
    c.header("X-Request-ID", c.get("requestId"));
    if (config.releaseSha) c.header("X-Release-SHA", config.releaseSha);
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "same-origin");
    c.header(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    await next();
  });
  app.onError((error, c) => {
    const known = error instanceof ServiceError;
    const validation = error instanceof z.ZodError;
    const status = known ? error.status : validation ? 400 : 500;
    if (status === 429) c.header("Retry-After", "60");
    const payload = errorSchema.parse({
      error: {
        code: known
          ? error.code
          : validation
            ? "VALIDATION_ERROR"
            : "INTERNAL_ERROR",
        message: known
          ? error.message
          : validation
            ? "The request does not match the API contract."
            : "The service could not complete this request.",
        requestId: c.get("requestId"),
        retryable: known ? error.retryable : status === 500,
        ...(validation
          ? {
              issues: error.issues.map((i) => ({
                path: i.path.join("."),
                message: i.message,
              })),
            }
          : {}),
      },
    });
    // Do not log raw request bodies, cookies or upstream errors.
    if (status >= 500)
      console.error(
        JSON.stringify({
          event: "api_failure",
          requestId: c.get("requestId"),
          status,
          code: payload.error.code,
        }),
      );
    return c.json(payload, status as ContentfulStatusCode);
  });
  app.get("/healthz", (c) => c.json({ status: "ok" }));
  app.get("/readyz", async (c) => {
    try {
      await Promise.race([
        store.ping(),
        new Promise<never>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Readiness deadline")),
            2000,
          );
          timer.unref();
        }),
      ]);
      return c.json({ status: "ready" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });

  app.use("/api/v1/*", async (c, next) => {
    const demoMethods: Record<string, string> = {
      "/api/v1/demo/scenarios": "GET",
      "/api/v1/demo/assess": "POST",
      "/api/v1/demo/explain": "POST",
      "/api/v1/demo/transcribe": "POST",
    };
    const demoMethod = demoMethods[c.req.path];
    if (
      demoMethod &&
      (c.req.method === demoMethod || c.req.method === "OPTIONS")
    ) {
      const origin = c.req.header("origin");
      if (
        (origin && origin !== config.origin) ||
        (demoMethod === "POST" && origin !== config.origin)
      )
        throw new ServiceError(
          403,
          "FORBIDDEN",
          "The configured application origin is required.",
        );
      if (origin === config.origin) {
        c.header("Access-Control-Allow-Origin", config.origin);
        c.header(
          "Access-Control-Expose-Headers",
          "X-Request-ID, X-Release-SHA",
        );
        c.header("Vary", "Origin");
      }
      if (c.req.method === "OPTIONS") {
        const headers = (c.req.header("access-control-request-headers") || "")
          .toLowerCase()
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean);
        if (
          origin !== config.origin ||
          c.req.header("access-control-request-method") !== demoMethod ||
          headers.some((h) => h !== "content-type")
        )
          throw new ServiceError(403, "FORBIDDEN", "Preflight is not allowed.");
        c.header("Access-Control-Allow-Methods", demoMethod);
        c.header("Access-Control-Allow-Headers", "Content-Type");
        return c.body(null, 204);
      }
      await consumeQuota(store, "public-demo-requests", 120, now());
      await next();
      return;
    }
    const origin = c.req.header("origin");
    const healthOnly = [
      "/api/v1/health",
      "/api/v1/capabilities",
      "/api/v1/openapi.json",
    ].includes(c.req.path);
    if (
      (origin && origin !== config.origin) ||
      (!healthOnly && c.req.header("sec-fetch-site") === "cross-site")
    )
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "Only the configured application origin is accepted. Cross-site guest cookies require sibling custom domains.",
      );
    if (origin === config.origin) {
      c.header("Access-Control-Allow-Origin", config.origin);
      c.header("Access-Control-Allow-Credentials", "true");
      c.header("Access-Control-Expose-Headers", "X-Request-ID, X-Release-SHA");
      c.header("Vary", "Origin");
    }
    if (c.req.method === "OPTIONS") {
      const method = c.req.header("access-control-request-method");
      const headers = (c.req.header("access-control-request-headers") || "")
        .toLowerCase()
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (
        origin !== config.origin ||
        !method ||
        !["GET", "POST", "PATCH", "DELETE"].includes(method) ||
        headers.some(
          (h) =>
            !["content-type", "x-csrf-token", "idempotency-key"].includes(h),
        )
      )
        throw new ServiceError(403, "FORBIDDEN", "Preflight is not permitted.");
      c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type, X-CSRF-Token, Idempotency-Key",
      );
      return c.body(null, 204);
    }
    const session = await sessions.resolve(getCookie(c, config.cookieName));
    const path = c.req.path;
    const publicPath =
      path === "/api/v1/health" ||
      path === "/api/v1/capabilities" ||
      path === "/api/v1/openapi.json" ||
      path === "/api/v1/session";
    if (!publicPath && !session?.ownerId)
      throw new ServiceError(
        401,
        "UNAUTHORIZED",
        "Start a guest session before accessing records.",
      );
    if (session) c.set("session", session);
    if (session?.ownerId) {
      c.set("ownerId", session.ownerId);
      await consumeQuota(store, "owner:" + session.ownerId, 120, now());
    }
    await next();
  });

  function respond<K extends Operation>(name: K, data: unknown, c: Ctx) {
    const endpoint = endpoints[name];
    const parsed = endpoint.response.safeParse({
      data,
      meta: { requestId: c.get("requestId") },
    });
    if (!parsed.success)
      throw new ServiceError(
        500,
        "INTERNAL_ERROR",
        "The service produced an invalid response.",
        true,
      );
    return c.json(parsed.data as ResponseBody<K>, endpoint.status);
  }
  // Keep the route chain intact: Hono RPC infers paths, validated inputs and responses here.
  function jsonBody<S extends z.ZodType<Record<string, unknown>>>(
    schema: S,
  ): MiddlewareHandler<
    Bindings,
    string,
    { in: { json: z.input<S> }; out: { json: z.output<S> } }
  > {
    return async (c, next) => {
      c.req.addValidatedData("json", schema.parse(await readBody(c)));
      await next();
    };
  }
  const csrf: MiddlewareHandler<
    Bindings,
    string,
    { in: { header: { "X-CSRF-Token": string } }; out: {} }
  > = async (c, next) => {
    const session = c.get("session");
    if (
      c.req.header("origin") !== config.origin ||
      !session ||
      !equalSecret(c.req.header("x-csrf-token") || "", session.csrfToken)
    ) {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "A valid same-origin session and CSRF token are required.",
      );
    }
    await next();
  };
  const key: MiddlewareHandler<
    Bindings,
    string,
    { in: { header: { "Idempotency-Key": string } }; out: {} }
  > = async (c, next) => {
    c.set("idempotencyKey", idSchema.parse(c.req.header("idempotency-key")));
    await next();
  };
  const queryParams: MiddlewareHandler<
    Bindings,
    string,
    {
      in: { query: z.input<typeof listQuerySchema> };
      out: { query: z.output<typeof listQuerySchema> };
    }
  > = async (c, next) => {
    c.req.addValidatedData("query", listQuerySchema.parse(c.req.query()));
    await next();
  };
  const id = (c: Ctx) => idSchema.parse(c.req.param("id"));
  const voiceQuery: MiddlewareHandler<
    Bindings,
    string,
    {
      in: { query: z.input<typeof voiceQuerySchema> };
      out: { query: z.output<typeof voiceQuerySchema> };
    }
  > = async (c, next) => {
    c.req.addValidatedData("query", voiceQuerySchema.parse(c.req.query()));
    await next();
  };
  const routes = app
    .get("/api/v1/demo/scenarios", (c) =>
      respond("demoScenarios", demo.scenarios(), c),
    )
    .post("/api/v1/demo/assess", jsonBody(demoInputSchema), (c) =>
      respond("demoAssess", demo.assess(c.req.valid("json")), c),
    )
    .post("/api/v1/demo/explain", jsonBody(demoExplainInputSchema), async (c) =>
      respond(
        "demoExplain",
        await demo.explain(c.req.valid("json"), c.req.raw.signal),
        c,
      ),
    )
    .post("/api/v1/demo/transcribe", voiceQuery, async (c) => {
      const { audio, seconds } = await readVoice(c.req.raw);
      return respond(
        "demoTranscribe",
        await demo.transcribe(
          audio,
          c.req.valid("query").locale,
          seconds,
          c.req.raw.signal,
        ),
        c,
      );
    })
    .get("/api/v1/health", (c) =>
      respond(
        "health",
        {
          status: "ok",
          service: "kavach-api",
          apiVersion: "v1",
          checkedAt: now().toISOString(),
        },
        c,
      ),
    )
    .get("/api/v1/capabilities", (c) =>
      respond(
        "capabilities",
        {
          apiVersion: "v1",
          environment: config.environment,
          persistence: config.storage,
          weather: config.weather,
          ai: config.explanationProvider === "google" ? "google" : "unavailable",
          conversations: false,
          supported: [{ district: "Latur", crop: "chickpea" }],
          sources: sourceReferences,
        },
        c,
      ),
    )
    .get("/api/v1/session", async (c) => {
      let session = c.get("session");
      if (!session) {
        await consumeQuota(store, "bootstrap-global", 120, now());
        const created = await sessions.create(null);
        session = created.session;
        writeCookie(c, created.token, created.ttl);
      }
      return respond(
        "session",
        {
          status: session.ownerId ? "guest" : "bootstrap",
          csrfToken: session.csrfToken,
          expiresAt: session.expiresAt,
        },
        c,
      );
    })
    .post(
      "/api/v1/session",
      csrf,
      jsonBody(endpoints.createSession.body),
      async (c) => {
        const created = await sessions.authenticate(c.get("session"));
        const session = created?.session || c.get("session");
        if (created) writeCookie(c, created.token, created.ttl);
        return respond(
          "createSession",
          {
            status: "guest",
            csrfToken: session.csrfToken,
            expiresAt: session.expiresAt,
          },
          c,
        );
      },
    )
    .delete(
      "/api/v1/session",
      csrf,
      jsonBody(endpoints.revokeSession.body),
      async (c) => {
        await sessions.revoke(c.get("session"));
        deleteCookie(c, config.cookieName, cookieOptions);
        return respond("revokeSession", { revoked: true }, c);
      },
    )
    .post(
      "/api/v1/farms",
      csrf,
      key,
      jsonBody(endpoints.createFarm.body),
      async (c) =>
        respond(
          "createFarm",
          await resources.createFarm(
            c.get("ownerId"),
            c.req.valid("json"),
            c.get("idempotencyKey"),
          ),
          c,
        ),
    )
    .get("/api/v1/farms/:id", async (c) =>
      respond("getFarm", await resources.getFarm(c.get("ownerId"), id(c)), c),
    )
    .patch(
      "/api/v1/farms/:id",
      csrf,
      jsonBody(endpoints.updateFarm.body),
      async (c) =>
        respond(
          "updateFarm",
          await resources.updateFarm(
            c.get("ownerId"),
            id(c),
            c.req.valid("json"),
          ),
          c,
        ),
    )
    .post(
      "/api/v1/assessments",
      csrf,
      key,
      jsonBody(endpoints.createAssessment.body),
      async (c) =>
        respond(
          "createAssessment",
          await resources.createAssessment(
            c.get("ownerId"),
            c.req.valid("json"),
            c.get("idempotencyKey"),
            c.req.raw.signal,
          ),
          c,
        ),
    )
    .get("/api/v1/assessments/:id", async (c) =>
      respond(
        "getAssessment",
        await resources.getAssessment(c.get("ownerId"), id(c)),
        c,
      ),
    )
    .post(
      "/api/v1/assessments/:id/compare",
      csrf,
      key,
      jsonBody(endpoints.compare.body),
      async (c) =>
        respond(
          "compare",
          await resources.compare(
            c.get("ownerId"),
            id(c),
            c.req.valid("json"),
            c.get("idempotencyKey"),
          ),
          c,
        ),
    )
    .post(
      "/api/v1/plans",
      csrf,
      key,
      jsonBody(endpoints.createPlan.body),
      async (c) =>
        respond(
          "createPlan",
          await resources.createPlan(
            c.get("ownerId"),
            c.req.valid("json"),
            c.get("idempotencyKey"),
          ),
          c,
        ),
    )
    .get("/api/v1/plans/:id", async (c) =>
      respond("getPlan", await resources.getPlan(c.get("ownerId"), id(c)), c),
    )
    .get("/api/v1/plans", queryParams, async (c) => {
      const query = c.req.valid("query");
      return respond(
        "listPlans",
        await resources.listPlans(
          c.get("ownerId"),
          Number(query.limit || 20),
          query.cursor,
        ),
        c,
      );
    })
    .patch(
      "/api/v1/plans/:id",
      csrf,
      jsonBody(endpoints.updatePlan.body),
      async (c) =>
        respond(
          "updatePlan",
          await resources.updatePlan(
            c.get("ownerId"),
            id(c),
            c.req.valid("json"),
          ),
          c,
        ),
    )
    .get("/api/v1/openapi.json", (c) =>
      c.json(openApiDocument() as Record<string, unknown>),
    );
  app.notFound((c) =>
    c.json(
      errorSchema.parse({
        error: {
          code: "NOT_FOUND",
          message: "No API endpoint exists at this path.",
          requestId: c.get("requestId"),
          retryable: false,
        },
      }),
      404,
    ),
  );
  return routes;
}
