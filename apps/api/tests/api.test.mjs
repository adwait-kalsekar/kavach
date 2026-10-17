import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../dist/app.js";
import { loadConfig } from "../dist/config.js";
import { SqliteStore } from "../dist/adapters/sqlite.js";
import { DisabledWeather } from "../dist/ports/weather.js";
import { FirestoreStore } from "../dist/adapters/firestore.js";
import { endpoints, errorSchema } from "@kavach/contracts";

const context = {
  district: "Latur",
  crop: "chickpea",
  stage: "planning",
  irrigation: "one",
  moisture: "unknown",
  seedAvailable: true,
  language: "en",
};
async function harness(env = {}) {
  if (
    process.env.TEST_FIRESTORE === "1" &&
    (!process.env.FIRESTORE_EMULATOR_HOST ||
      !/^demo-/.test(process.env.GOOGLE_CLOUD_PROJECT || ""))
  )
    throw Error("Firestore tests require an emulator and a demo-* project.");
  const store =
    process.env.TEST_FIRESTORE === "1"
      ? new FirestoreStore(
          process.env.GOOGLE_CLOUD_PROJECT,
          "test-" + randomUUID(),
        )
      : new SqliteStore(":memory:");
  let instant = new Date("2026-10-17T00:00:00Z");
  let weatherCalls = 0;
  const config = loadConfig(env);
  const app = createApp({
    config,
    store,
    now: () => instant,
    weather: {
      getForecast: async () => {
        weatherCalls++;
        return new DisabledWeather().getForecast();
      },
    },
  });
  function browser() {
    let cookie = "";
    let csrf = "";
    return {
      get cookie() {
        return cookie;
      },
      get csrf() {
        return csrf;
      },
      async call(name, body, opts = {}) {
        const e = endpoints[name];
        const headers = {
          cookie,
          ...(e.method !== "GET"
            ? {
                "content-type": "application/json",
                origin: config.origin,
                "x-csrf-token": csrf,
              }
            : {}),
          ...("idempotent" in e
            ? { "idempotency-key": opts.key || randomUUID() }
            : {}),
          ...opts.headers,
        };
        const path = e.path.replace("{id}", opts.id || "") + (opts.query || "");
        const response = await app.request(path, {
          method: e.method,
          headers,
          body: e.method === "GET" ? undefined : JSON.stringify(body ?? {}),
        });
        const value = await response.json();
        if (response.headers.get("set-cookie"))
          cookie = response.headers.get("set-cookie").split(";")[0];
        if (value.data?.csrfToken) csrf = value.data.csrfToken;
        if (response.ok) e.response.parse(value);
        else errorSchema.parse(value);
        return { response, value, data: value.data };
      },
      async start() {
        await this.call("session");
        return this.call("createSession", {});
      },
    };
  }
  return {
    app,
    store,
    browser,
    advance: (ms) => {
      instant = new Date(instant.getTime() + ms);
    },
    weatherCalls: () => weatherCalls,
  };
}

test("complete guest → farm → assessment → comparison → save/retrieve workflow", async () => {
  const h = await harness();
  try {
    const user = h.browser();
    const started = await user.start();
    assert.equal(started.data.status, "guest");
    assert.match(started.response.headers.get("set-cookie"), /HttpOnly/);
    const farm = (await user.call("createFarm", { context })).data;
    const assessment = (
      await user.call("createAssessment", {
        farmId: farm.id,
        expectedFarmRevision: 1,
      })
    ).data;
    assert.equal(assessment.weather.status, "unavailable");
    assert.equal(assessment.mode, "confirmed");
    const comparison = (
      await user.call(
        "compare",
        { changes: { irrigation: "none" } },
        { id: assessment.id },
      )
    ).data;
    assert.equal(comparison.mode, "hypothetical");
    assert.ok(comparison.actions.some((a) => a.id === "rainfed-check"));
    assert.equal(
      (await user.call("getFarm", undefined, { id: farm.id })).data.context
        .irrigation,
      "one",
    );
    assert.equal(
      (await user.call("createPlan", { assessmentId: comparison.id })).response
        .status,
      409,
    );
    const plan = (
      await user.call("createPlan", { assessmentId: assessment.id })
    ).data;
    const changed = await user.call(
      "updatePlan",
      {
        expectedRevision: 1,
        tasks: plan.tasks.map((t, i) =>
          i === 0 ? { ...t, status: "blocked", blocker: "local-check" } : t,
        ),
      },
      { id: plan.id },
    );
    assert.equal(changed.data.revision, 2);
    assert.equal(
      (await user.call("getAssessment", undefined, { id: assessment.id })).data
        .context.irrigation,
      "one",
    );
    assert.equal((await user.call("listPlans")).data.items.length, 1);
  } finally {
    await h.store.close();
  }
});
test("another visitor cannot read/write/link private resources; unauthenticated records remain private", async () => {
  const h = await harness();
  try {
    const a = h.browser(),
      b = h.browser(),
      anonymous = h.browser();
    await a.start();
    await b.start();
    const f = (await a.call("createFarm", { context })).data;
    const assessment = (
      await a.call("createAssessment", {
        farmId: f.id,
        expectedFarmRevision: 1,
      })
    ).data;
    const plan = (await a.call("createPlan", { assessmentId: assessment.id }))
      .data;
    for (const [name, id] of [
      ["getFarm", f.id],
      ["getAssessment", assessment.id],
      ["getPlan", plan.id],
    ])
      assert.equal(
        (await b.call(name, undefined, { id })).response.status,
        404,
      );
    assert.equal(
      (
        await b.call(
          "updateFarm",
          { context, expectedRevision: 1 },
          { id: f.id },
        )
      ).response.status,
      404,
    );
    assert.equal(
      (await b.call("createPlan", { assessmentId: assessment.id })).response
        .status,
      404,
    );
    assert.equal(
      (
        await b.call("createAssessment", {
          farmId: f.id,
          expectedFarmRevision: 1,
        })
      ).response.status,
      404,
    );
    assert.equal(
      (await anonymous.call("getFarm", undefined, { id: f.id })).response
        .status,
      401,
    );
    assert.equal((await b.call("listPlans")).data.items.length, 0);
  } finally {
    await h.store.close();
  }
});
test("idempotency handles concurrent duplicates, payload mismatch and replay without a new provider call", async () => {
  const h = await harness();
  try {
    const a = h.browser();
    await a.start();
    const key = randomUUID();
    const [one, two] = await Promise.all([
      a.call("createFarm", { context }, { key }),
      a.call("createFarm", { context }, { key }),
    ]);
    assert.equal(one.data.id, two.data.id);
    assert.equal(
      (
        await a.call(
          "createFarm",
          { context: { ...context, irrigation: "none" } },
          { key },
        )
      ).response.status,
      409,
    );
    const assessmentKey = randomUUID();
    const body = { farmId: one.data.id, expectedFarmRevision: 1 };
    const first = await a.call("createAssessment", body, {
      key: assessmentKey,
    });
    const calls = h.weatherCalls();
    assert.equal(
      (await a.call("createAssessment", body, { key: assessmentKey })).data.id,
      first.data.id,
    );
    assert.equal(h.weatherCalls(), calls);
  } finally {
    await h.store.close();
  }
});
test("revision conflicts reject stale updates before requesting a forecast", async () => {
  const h = await harness();
  try {
    const a = h.browser();
    await a.start();
    const farm = (await a.call("createFarm", { context })).data;
    assert.equal(
      (
        await a.call(
          "updateFarm",
          { context: { ...context, irrigation: "none" }, expectedRevision: 1 },
          { id: farm.id },
        )
      ).data.revision,
      2,
    );
    assert.equal(
      (
        await a.call(
          "updateFarm",
          { context, expectedRevision: 1 },
          { id: farm.id },
        )
      ).response.status,
      409,
    );
    assert.equal(
      (
        await a.call("createAssessment", {
          farmId: farm.id,
          expectedFarmRevision: 1,
        })
      ).response.status,
      409,
    );
    assert.equal(h.weatherCalls(), 0);
  } finally {
    await h.store.close();
  }
});
test("CSRF, exact-origin, oversized/invalid JSON and strict contract failures are structured", async () => {
  const h = await harness();
  try {
    const a = h.browser();
    await a.start();
    assert.equal(
      (
        await a.call(
          "createFarm",
          { context },
          { headers: { "x-csrf-token": "bad" } },
        )
      ).response.status,
      403,
    );
    assert.equal(
      (
        await a.call(
          "createFarm",
          { context },
          { headers: { origin: "https://evil.example" } },
        )
      ).response.status,
      403,
    );
    assert.equal(
      (await a.call("createFarm", { context, ownerId: "injected" })).response
        .status,
      400,
    );
    assert.equal(
      (await a.call("getFarm", undefined, { id: "not-a-uuid" })).response
        .status,
      400,
    );
    const headers = {
      cookie: a.cookie,
      origin: "http://localhost:8080",
      "x-csrf-token": a.csrf,
      "idempotency-key": randomUUID(),
      "content-type": "application/json",
    };
    for (const [body, status] of [
      ["{", 400],
      ["x".repeat(17000), 413],
    ]) {
      const r = await h.app.request("/api/v1/farms", {
        method: "POST",
        headers,
        body,
      });
      assert.equal(r.status, status);
      errorSchema.parse(await r.json());
    }
    const r = await h.app.request("/api/v1/farms", {
      method: "POST",
      headers: { ...headers, "content-type": "text/plain" },
      body: "{}",
    });
    assert.equal(r.status, 415);
  } finally {
    await h.store.close();
  }
});
test("logout and expiry revoke access even if the session document still exists", async () => {
  const h = await harness({ SESSION_TTL_SECONDS: "60" });
  try {
    const a = h.browser();
    await a.start();
    const farm = (await a.call("createFarm", { context })).data;
    h.advance(61000);
    assert.equal(
      (await a.call("getFarm", undefined, { id: farm.id })).response.status,
      401,
    );
    await a.start();
    const currentCookie = a.cookie;
    await a.call("revokeSession", {});
    const r = await h.app.request("/api/v1/plans", {
      headers: { cookie: currentCookie },
    });
    assert.equal(r.status, 401);
  } finally {
    await h.store.close();
  }
});
test("history uses bounded pagination with stable ordering and no duplicates", async () => {
  const h = await harness();
  try {
    const a = h.browser();
    await a.start();
    const f = (await a.call("createFarm", { context })).data;
    const assessment = (
      await a.call("createAssessment", {
        farmId: f.id,
        expectedFarmRevision: 1,
      })
    ).data;
    for (let i = 0; i < 3; i++)
      await a.call("createPlan", { assessmentId: assessment.id });
    const page1 = (await a.call("listPlans", undefined, { query: "?limit=2" }))
      .data;
    const page2 = (
      await a.call("listPlans", undefined, {
        query: "?limit=2&cursor=" + page1.nextCursor,
      })
    ).data;
    assert.equal(page1.items.length, 2);
    assert.equal(page2.items.length, 1);
    assert.equal(
      new Set([...page1.items, ...page2.items].map((p) => p.id)).size,
      3,
    );
    assert.equal(page2.nextCursor, null);
    assert.equal(
      (await a.call("listPlans", undefined, { query: "?cursor=garbage" }))
        .response.status,
      400,
    );
    assert.equal(
      (await a.call("listPlans", undefined, { query: "?limit=500" })).response
        .status,
      400,
    );
  } finally {
    await h.store.close();
  }
});
test("production guest cookie is host-only/secure; metadata does not expose credentials", async () => {
  const h = await harness({
    APP_ENV: "production",
    STORAGE_BACKEND: "firestore",
    GOOGLE_CLOUD_PROJECT: "example",
    APP_ORIGIN: "https://kavach.example",
  });
  try {
    const a = h.browser();
    const r = await a.start();
    const cookie = r.response.headers.get("set-cookie");
    assert.match(cookie, /__Host-kavach_session=/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /HttpOnly/);
    assert.doesNotMatch(cookie, /Domain=/);
    assert.equal(r.data.ownerId, undefined);
    const caps = (await a.call("capabilities")).data;
    assert.equal(caps.ai, "unavailable");
    assert.equal(caps.conversations, false);
  } finally {
    await h.store.close();
  }
});
test("database failure never reports success or leaks the upstream error", async () => {
  const h = await harness();
  try {
    const a = h.browser();
    await a.start();
    const transaction = h.store.transaction.bind(h.store);
    h.store.transaction = async () => {
      throw Error("credential=secret");
    };
    const r = await a.call("createFarm", { context });
    assert.equal(r.response.status, 500);
    assert.doesNotMatch(JSON.stringify(r.value), /secret/);
    h.store.transaction = transaction;
  } finally {
    await h.store.close();
  }
});
test("Hono test interface supports health, readiness, OpenAPI and structured API 404", async () => {
  const h = await harness();
  try {
    for (const path of ["/healthz", "/readyz", "/api/v1/openapi.json"])
      assert.equal((await h.app.request(path)).status, 200);
    const a = h.browser();
    await a.start();
    const r = await h.app.request("/api/v1/no-such-route", {
      headers: { cookie: a.cookie },
    });
    assert.equal(r.status, 404);
    errorSchema.parse(await r.json());
  } finally {
    await h.store.close();
  }
});

test("public typed health contract and RPC routes match the OpenAPI endpoint registry", async () => {
  const h = await harness({ RELEASE_SHA: "a".repeat(40) });
  try {
    const response = await h.app.request("/api/v1/health");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-release-sha"), "a".repeat(40));
    const body = endpoints.health.response.parse(await response.json());
    assert.equal(body.data.service, "kavach-api");
    assert.equal(body.data.status, "ok");
    assert.equal(response.headers.get("set-cookie"), null);
    for (const endpoint of Object.values(endpoints)) {
      assert.ok(
        h.app.routes.some(
          (route) =>
            route.method === endpoint.method &&
            route.path === endpoint.path.replace("{id}", ":id"),
        ),
        `${endpoint.method} ${endpoint.path} missing from the typed route chain`,
      );
    }
  } finally {
    await h.store.close();
  }
});
