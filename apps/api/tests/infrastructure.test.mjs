import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../dist/config.js";
import { SqliteStore } from "../dist/adapters/sqlite.js";
import { SessionService } from "../dist/services/session.js";
import { OpenMeteoWeather } from "../dist/adapters/open-meteo.js";

test("local default needs no project; production rejects unsafe or ambiguous setup", () => {
  assert.equal(loadConfig({}).storage, "sqlite");
  for (const env of [
    { APP_ENV: "production" },
    {
      APP_ENV: "production",
      STORAGE_BACKEND: "firestore",
      GOOGLE_CLOUD_PROJECT: "p",
      APP_ORIGIN: "http://localhost:8080",
    },
    {
      APP_ENV: "production",
      STORAGE_BACKEND: "firestore",
      GOOGLE_CLOUD_PROJECT: "p",
      APP_ORIGIN: "https://example.com",
      FIRESTORE_EMULATOR_HOST: "localhost:8085",
    },
    { STORAGE_BACKEND: "firestore" },
    { APP_ORIGIN: "http://localhost:8080/path" },
  ])
    assert.throws(() => loadConfig(env));
  assert.equal(
    loadConfig({
      APP_ENV: "production",
      STORAGE_BACKEND: "firestore",
      GOOGLE_CLOUD_PROJECT: "p",
      APP_ORIGIN: "https://example.com",
    }).cookieName,
    "__Host-kavach_session",
  );
});
test("SQLite rollback, serialized concurrency and process-reopen persistence", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kavach-"));
  const path = join(dir, "db.sqlite");
  let store = new SqliteStore(path);
  try {
    await assert.rejects(() =>
      store.transaction(async (tx) => {
        tx.put("quotas", "rollback", { used: 1 });
        throw Error("failure");
      }),
    );
    assert.equal(await store.read("quotas", "rollback"), null);
    await Promise.all(
      Array.from({ length: 20 }, () =>
        store.transaction(async (tx) => {
          const old = await tx.get("quotas", "counter");
          tx.put("quotas", "counter", { used: (old?.used ?? 0) + 1 });
        }),
      ),
    );
    assert.equal((await store.read("quotas", "counter")).used, 20);
    await store.close();
    store = new SqliteStore(path);
    assert.equal((await store.read("quotas", "counter")).used, 20);
  } finally {
    await store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("public SQLite readers do not observe an unfinished write", async () => {
  const store = new SqliteStore(":memory:");
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  let started;
  const ready = new Promise((r) => {
    started = r;
  });
  const tx = store.transaction(async (t) => {
    t.put("farms", "pending", { value: "uncommitted" });
    started();
    await gate;
    throw Error("rollback");
  });
  await ready;
  let observed = false;
  const reader = store.read("farms", "pending").then((v) => {
    observed = true;
    return v;
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(observed, false);
  release();
  await assert.rejects(tx);
  assert.equal(await reader, null);
  await store.close();
});
test("only hashes of opaque session cookies are persisted; expiry is enforced before TTL deletion", async () => {
  const store = new SqliteStore(":memory:");
  let now = new Date("2026-10-17T00:00:00Z");
  const service = new SessionService(
    store,
    loadConfig({ SESSION_TTL_SECONDS: "60" }),
    () => now,
  );
  try {
    const bootstrap = await service.create(null);
    const guest = await service.authenticate(bootstrap.session);
    assert.equal(await store.read("sessions", guest.token), null);
    assert.equal(await service.resolve(bootstrap.token), null);
    assert.equal(
      (await service.resolve(guest.token)).ownerId,
      guest.session.ownerId,
    );
    now = new Date(now.getTime() + 61000);
    assert.equal(await service.resolve(guest.token), null);
    assert.ok(await store.read("sessions", guest.session.key));
  } finally {
    await store.close();
  }
});
function forecast() {
  return {
    daily_units: { precipitation_sum: "mm", temperature_2m_max: "°C" },
    daily: {
      time: Array.from({ length: 7 }, (_, i) => `2026-10-${17 + i}`),
      precipitation_sum: [0, 1, 2, 3, 4, 5, 6],
      temperature_2m_max: [30, 31, 32, 33, 34, 35, 36],
    },
  };
}
test("weather provider validates freshness and units; exposes real provenance and caches a valid response", async () => {
  let calls = 0;
  const adapter = new OpenMeteoWeather(
    undefined,
    async () => {
      calls++;
      return Response.json(forecast());
    },
    () => new Date("2026-10-17T00:00:00Z"),
  );
  const first = await adapter.getForecast();
  assert.equal(first.status, "available");
  assert.equal(first.provenance.forecastIssuedAt, null);
  assert.equal(first.days[0].rainMm, 0);
  first.days[0].rainMm = 999;
  assert.equal((await adapter.getForecast()).days[0].rainMm, 0);
  assert.equal(calls, 1);
});
test("stale, incomplete, null-valued, wrong-unit and failing weather produce unavailable rather than fake data", async () => {
  const broken = [
    {
      ...forecast(),
      daily_units: { precipitation_sum: "m", temperature_2m_max: "°C" },
    },
    { ...forecast(), daily: { ...forecast().daily, time: ["2026-01-01"] } },
    {
      ...forecast(),
      daily: {
        ...forecast().daily,
        precipitation_sum: [null, 1, 2, 3, 4, 5, 6],
      },
    },
  ];
  for (const raw of broken) {
    const adapter = new OpenMeteoWeather(
      undefined,
      async () => Response.json(raw),
      () => new Date("2026-10-17T00:00:00Z"),
    );
    const data = await adapter.getForecast();
    assert.equal(data.status, "unavailable");
    assert.equal(data.days, undefined);
  }
  const unavailable = new OpenMeteoWeather(undefined, async () => {
    throw Error("secret upstream error");
  });
  assert.equal((await unavailable.getForecast()).status, "unavailable");
});
