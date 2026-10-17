import { randomUUID } from "node:crypto";
import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import {
  endpoints,
  errorSchema,
  idSchema,
  listQuerySchema,
  openApiDocument,
  type Operation,
  type RequestBody,
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
  now = () => new Date(),
}: Dependencies) {
  const app = new Hono<Bindings>();
  const sessions = new SessionService(store, config, now);
  const resources = new ResourceService(store, weather, now);
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
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "same-origin");
    c.header(
      "Content-Security-Policy",
      "default-src 'none'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
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
    const origin = c.req.header("origin");
    if (
      (origin && origin !== config.origin) ||
      c.req.header("sec-fetch-site") === "cross-site"
    )
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "Only same-origin application requests are accepted.",
      );
    const session = await sessions.resolve(getCookie(c, config.cookieName));
    const path = c.req.path;
    const publicPath =
      path === "/api/v1/capabilities" ||
      path === "/api/v1/openapi.json" ||
      path === "/api/v1/session";
    if (!publicPath && !session?.ownerId)
      throw new ServiceError(
        401,
        "UNAUTHORIZED",
        "Start a guest session before accessing records.",
      );
    if (!["GET", "HEAD"].includes(c.req.method)) {
      if (
        origin !== config.origin ||
        !session ||
        !equalSecret(c.req.header("x-csrf-token") || "", session.csrfToken)
      )
        throw new ServiceError(
          403,
          "FORBIDDEN",
          "A valid same-origin session and CSRF token are required.",
        );
    }
    if (session) c.set("session", session);
    if (session?.ownerId) {
      c.set("ownerId", session.ownerId);
      await consumeQuota(store, "owner:" + session.ownerId, 120, now());
    }
    await next();
  });

  function register<K extends Operation>(
    name: K,
    handler: (c: Ctx, body: RequestBody<K>) => Promise<unknown>,
  ) {
    const endpoint = endpoints[name];
    app.on(endpoint.method, endpoint.path.replace("{id}", ":id"), async (c) => {
      if (c.req.param("id") !== undefined) idSchema.parse(c.req.param("id"));
      if ("idempotent" in endpoint)
        c.set(
          "idempotencyKey",
          idSchema.parse(c.req.header("idempotency-key")),
        );
      const body =
        "body" in endpoint ? endpoint.body.parse(await readBody(c)) : undefined;
      const data = await handler(c, body as RequestBody<K>);
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
      return c.json(parsed.data, endpoint.status);
    });
  }
  const id = (c: Ctx) => idSchema.parse(c.req.param("id"));
  register("capabilities", async () => ({
    apiVersion: "v1",
    environment: config.environment,
    persistence: config.storage,
    weather: config.weather,
    ai: "unavailable",
    conversations: false,
    supported: [{ district: "Latur", crop: "chickpea" }],
    sources: sourceReferences,
  }));
  register("session", async (c) => {
    let session = c.get("session");
    if (!session) {
      await consumeQuota(store, "bootstrap-global", 120, now());
      const created = await sessions.create(null);
      session = created.session;
      writeCookie(c, created.token, created.ttl);
    }
    return {
      status: session.ownerId ? "guest" : "bootstrap",
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  });
  register("createSession", async (c) => {
    const created = await sessions.authenticate(c.get("session"));
    const session = created?.session || c.get("session");
    if (created) writeCookie(c, created.token, created.ttl);
    return {
      status: "guest",
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  });
  register("revokeSession", async (c) => {
    await sessions.revoke(c.get("session"));
    deleteCookie(c, config.cookieName, cookieOptions);
    return { revoked: true };
  });
  register("createFarm", (c, body) =>
    resources.createFarm(c.get("ownerId"), body, c.get("idempotencyKey")),
  );
  register("getFarm", (c) => resources.getFarm(c.get("ownerId"), id(c)));
  register("updateFarm", (c, body) =>
    resources.updateFarm(c.get("ownerId"), id(c), body),
  );
  register("createAssessment", (c, body) =>
    resources.createAssessment(
      c.get("ownerId"),
      body,
      c.get("idempotencyKey"),
      c.req.raw.signal,
    ),
  );
  register("getAssessment", (c) =>
    resources.getAssessment(c.get("ownerId"), id(c)),
  );
  register("compare", (c, body) =>
    resources.compare(c.get("ownerId"), id(c), body, c.get("idempotencyKey")),
  );
  register("createPlan", (c, body) =>
    resources.createPlan(c.get("ownerId"), body, c.get("idempotencyKey")),
  );
  register("getPlan", (c) => resources.getPlan(c.get("ownerId"), id(c)));
  register("listPlans", (c) => {
    const query = listQuerySchema.parse(c.req.query());
    return resources.listPlans(
      c.get("ownerId"),
      Number(query.limit || 20),
      query.cursor,
    );
  });
  register("updatePlan", (c, body) =>
    resources.updatePlan(c.get("ownerId"), id(c), body),
  );
  app.get("/api/v1/openapi.json", (c) => c.json(openApiDocument()));
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
  return app;
}
